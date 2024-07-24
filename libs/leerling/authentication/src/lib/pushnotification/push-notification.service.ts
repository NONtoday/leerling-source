import { Injectable, inject } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Store } from '@ngxs/store';
import { getIsLoggingEnabled, info } from 'debugger';
import { RAccountDevice } from 'leerling-codegen';
import { RequestInformationBuilder, RequestService } from 'leerling-request';
import { InfoMessageService, isAndroid, isIOS, isWeb } from 'leerling-util';
import { IncomingPushAction, PushActionSelectors, SPushAction } from 'leerling/store';
import { Observable, catchError, filter, finalize } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';

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

    constructor() {
        this._clickedPushNotications = this._store
            .select(PushActionSelectors.getPushActionState())
            .pipe(filter((state) => !!state?.triggered));
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
                        catchError((err) => {
                            this._isPublishingToken = false;
                            return err;
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
                new IncomingPushAction(notification.data?.type, notification.data?.leerlingId, notification.data?.entityId, false)
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
                    notificationAction.notification.data?.leerling_identifier,
                    notificationAction.notification.data?.identifier,
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

    get clickedPushNotications(): Observable<SPushAction> {
        return this._clickedPushNotications;
    }
}
