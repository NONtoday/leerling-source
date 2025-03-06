import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PushNotifications } from '@capacitor/push-notifications';
import { Store } from '@ngxs/store';
import { getIsLoggingEnabled, info } from 'debugger';
import { RAccountDevice } from 'leerling-codegen';
import { RequestInformationBuilder, RequestService } from 'leerling-request';
import { InfoMessageService, isAndroid, isIOS, isWeb } from 'leerling-util';
import { IncomingPushAction, PushActionSelectors, SPushAction, toLocalDateTime } from 'leerling/store';
import { isEqual } from 'lodash-es';
import { EMPTY, Observable, catchError, filter, finalize, map } from 'rxjs';
import { SomtodayAccountProfiel, SomtodayLeerling } from '../models/authentication.models';
import { AuthenticationService } from '../services/authentication.service';

export interface PushnotificationAccountWrapper {
    pushAction: SPushAction;
    verzorgerLeerlingAccountData?: VerzorgerProfielLeerlingWrapper;
}
export interface VerzorgerProfielLeerlingWrapper {
    verzorgerProfiel: SomtodayAccountProfiel;
    leerling: SomtodayLeerling;
}

@Injectable({
    providedIn: 'root'
})
export class PushNotificationService {
    private _infomessageService = inject(InfoMessageService);
    private _authService = inject(AuthenticationService);
    private _requestService = inject(RequestService);
    private _isPublishingToken = false;
    private _store = inject(Store);

    private _clickedPushNotications: Observable<SPushAction>;
    private beschikbareProfielenSignal = toSignal(this._authService.beschikbareProfielen$);
    private huidigeProfielSignal = toSignal(this._authService.currentProfiel$);

    constructor() {
        this._clickedPushNotications = this._store
            .select(PushActionSelectors.getPushActionState())
            .pipe(filter((state) => !!state?.triggered));
    }

    public registerPushnotifications(): Observable<PushnotificationAccountWrapper | undefined> {
        this.setupListenersOnly();

        return this._clickedPushNotications.pipe(
            map((pushAction) => {
                const { leerlingId, accountUUID } = pushAction;
                if (this.isCurrentPushnotificationContextValid(leerlingId, accountUUID)) return { pushAction };

                const verzorgerLeerlingAccountData = this.findPushnotificationVerzorgerEnLeerling(leerlingId, accountUUID);
                const leerling = verzorgerLeerlingAccountData?.leerling;
                const verzorgerProfiel = verzorgerLeerlingAccountData?.verzorgerProfiel;

                if (verzorgerProfiel && leerling) return { pushAction, verzorgerLeerlingAccountData };

                return undefined;
            })
        );
    }

    private async _addListeners(): Promise<void> {
        await PushNotifications.removeAllListeners();
        await PushNotifications.addListener('registration', (token) => {
            if (!this._authService.isCurrentContextLoggedIn) {
                return;
            }
            const accountDevice = {
                pushToken: token.value,
                deviceType: isIOS() ? 'IOS' : isAndroid() ? 'ANDROID' : 'WEB'
            } as RAccountDevice;
            if (!this._isPublishingToken) {
                this._isPublishingToken = true;
                this._requestService
                    .put<RAccountDevice>('accountdevices', new RequestInformationBuilder().body(accountDevice).build())
                    .pipe(
                        catchError(() => {
                            this._isPublishingToken = false;
                            return EMPTY;
                        }),
                        finalize(() => {
                            this._isPublishingToken = false;
                        })
                    )
                    .subscribe();
            }
        });

        await PushNotifications.addListener('registrationError', () => {
            this._infomessageService.dispatchErrorMessage('Er ging iets mis bij het registreren van jouw toestel voor notificaties.');
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            if (getIsLoggingEnabled()) {
                this._infomessageService.dispatchInfoMessage(JSON.stringify(notification.data));
            }
            this._store.dispatch(
                new IncomingPushAction(
                    notification.data?.type,
                    Number(notification.data?.leerlingId),
                    notification.data?.accountUUID,
                    Number(notification.data?.entityId),
                    notification.data?.datum ? toLocalDateTime(notification.data.datum) : undefined,
                    false
                )
            );
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
            if (getIsLoggingEnabled()) {
                this._infomessageService.dispatchInfoMessage(
                    `Push notification action performed: ${JSON.stringify(notificationAction.notification.data)}`
                );
            }
            this._store.dispatch(
                new IncomingPushAction(
                    notificationAction.notification.data?.type,
                    Number(notificationAction.notification.data?.leerling_identifier),
                    notificationAction.notification.data?.account_identifier,
                    Number(notificationAction.notification.data?.identifier),
                    notificationAction.notification.data?.datum ? toLocalDateTime(notificationAction.notification.data.datum) : undefined,
                    true
                )
            );
        });
    }

    private async _registerNotifications() {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            if (getIsLoggingEnabled()) {
                info(`PushNotification state: ${permStatus.receive}`);
            }
        }
        if (!this._isPublishingToken) {
            await PushNotifications.register();
        }
    }

    async getDeliveredNotifications() {
        const notificationList = await PushNotifications.getDeliveredNotifications();
        info('delivered notifications: ' + JSON.stringify(notificationList));
    }

    public async setupPushNotification(): Promise<void> {
        if (!isWeb()) {
            info('setupPushNotification');
            await this._registerNotifications();
        }
    }

    public async setupListenersOnly(): Promise<void> {
        if (!isWeb()) {
            await this._addListeners();
        }
    }

    public isCurrentPushnotificationContextValid(
        pushActionLeerlingId: number | undefined,
        pushActionAccountUUID: string | undefined
    ): boolean {
        // wanneer de huidige accountContext een leerling betreft of een verzorger kijkend naar deze leerling is het niet nodig om te switchen van context.
        if (this._authService.isCurrentContextLeerling) return true;

        const huidigProfiel = this.huidigeProfielSignal();

        if (pushActionLeerlingId) return !!huidigProfiel?.subLeerlingen.find((leerling) => leerling.id === pushActionLeerlingId);

        // Boodschap berichten bevatten geen leerlingId, in plaats daarvan een accountUUID. Komt dit overeen met het huidige profiel is het niet nodig om te switchen van context.
        if (pushActionAccountUUID) return isEqual(huidigProfiel?.accountUUID, pushActionAccountUUID);

        return false;
    }

    public findPushnotificationVerzorgerEnLeerling(
        pushActionLeerlingId: number | undefined,
        pushActionAccountUUID: string | undefined
    ): VerzorgerProfielLeerlingWrapper | undefined {
        const profiles = this.beschikbareProfielenSignal();
        if (!profiles) return undefined;

        // Bij een Boodschap bericht (geen leerlingId) switchen we naar het profiel van de ouder met de eerst gevonden leerling.
        if (pushActionAccountUUID) {
            const profile = profiles.find((profiel) => isEqual(profiel.accountUUID, pushActionAccountUUID));
            return profile ? { verzorgerProfiel: profile, leerling: profile.subLeerlingen[0] } : undefined;
        }

        if (pushActionLeerlingId) {
            for (const profile of profiles) {
                const leerling = profile.subLeerlingen.find((l) => l.id === pushActionLeerlingId);
                if (leerling) {
                    return { verzorgerProfiel: profile, leerling };
                }
            }
        }

        return undefined;
    }

    get clickedPushNotications(): Observable<SPushAction> {
        return this._clickedPushNotications;
    }
}
