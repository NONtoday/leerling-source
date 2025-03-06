import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PushNotifications } from '@capacitor/push-notifications';
import { AndroidSettings, IOSSettings, NativeSettings } from 'capacitor-native-settings';
import { SpinnerComponent, ToggleComponent } from 'harmony';
import { AuthenticationService, SomtodayAccountProfiel } from 'leerling-authentication';
import { StackedAvatarComponent } from 'leerling-avatar';
import { InfoMessageService, isAndroid, isIOS, isWeb } from 'leerling-util';
import { BehaviorSubject, Observable, lastValueFrom } from 'rxjs';
import { NotificatieSettings, NotificatieSettingsService } from './service/notificatie-settings.service';

@Component({
    selector: 'sl-notificatie-settings',
    imports: [CommonModule, ToggleComponent, FormsModule, StackedAvatarComponent, SpinnerComponent],
    templateUrl: './notificatie-settings.component.html',
    styleUrls: ['./notificatie-settings.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificatieSettingsComponent implements OnInit, OnDestroy {
    private authService = inject(AuthenticationService);
    private notificationService = inject(NotificatieSettingsService);
    private _infomessageService = inject(InfoMessageService);

    public currentProfile$: Observable<SomtodayAccountProfiel | undefined>;
    public notificatieSettings$: Observable<NotificatieSettings>;
    public pushTokenBlocked$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    public resultatenMeldingen: WritableSignal<boolean | undefined> = signal(undefined);
    public absentiesMeldingen: WritableSignal<boolean | undefined> = signal(undefined);
    public mededelingenMeldingen: WritableSignal<boolean | undefined> = signal(undefined);

    private _timer: any;

    deviceSpecificNotification = 'Wil je niks missen? Zet de notificaties aan in de instellingen van je apparaat.';

    private _settingsOpenFailMessage =
        'We konden op jouw telefoon notification settings niet openen, probeer het handmatige via de settings van je telefoon.';

    async ngOnInit() {
        this.currentProfile$ = this.authService.currentProfiel$;
        this.notificatieSettings$ = this.notificationService.getNotificatieSettings();

        if (this.isWeb) {
            this.deviceSpecificNotification = 'In de webbrowser ondersteunen we op dit moment geen notificaties.';
        } else {
            this._updatePushState();
            this._timer = setInterval(() => {
                this._updatePushState();
            }, 1000);
        }
        const settings = await lastValueFrom(this.notificatieSettings$);
        this.resultatenMeldingen.set(settings.leerlingAppResultatenMeldingen);
        this.absentiesMeldingen.set(settings.leerlingAppAbsentieMeldingen);
        this.mededelingenMeldingen.set(settings.leerlingAppBerichtenMeldingen);
    }

    ngOnDestroy() {
        if (this._timer) {
            clearTimeout(this._timer);
        }
    }

    saveSettings() {
        this.notificationService.putNotificatieSettings({
            leerlingAppAbsentieMeldingen: this.absentiesMeldingen(),
            leerlingAppBerichtenMeldingen: this.mededelingenMeldingen(),
            leerlingAppResultatenMeldingen: this.resultatenMeldingen()
        } as NotificatieSettings);
    }

    private _updatePushState(): void {
        if (!this.isWeb) {
            PushNotifications.checkPermissions().then((result) => {
                this.pushTokenBlocked$.next(result.receive === 'denied');
                if (result.receive === 'prompt') {
                    this.requestPushPermission();
                }
            });
        }
    }

    public async requestPushPermission(): Promise<void> {
        await PushNotifications.requestPermissions();
        this._updatePushState();
    }

    toggleResultaten(): void {
        this.resultatenMeldingen.set(!this.resultatenMeldingen());
        this.saveSettings();
    }

    toggleAbsenties(): void {
        this.absentiesMeldingen.set(!this.absentiesMeldingen());
        this.saveSettings();
    }

    toggleMededelingen(): void {
        this.mededelingenMeldingen.set(!this.mededelingenMeldingen());
        this.saveSettings();
    }

    goToSettings() {
        if (isAndroid()) {
            NativeSettings.openAndroid({
                option: AndroidSettings.ApplicationDetails
            }).then((result) => {
                if (!result.status) {
                    this._infomessageService.dispatchErrorMessage(this._settingsOpenFailMessage);
                }
            });
        }
        if (isIOS()) {
            NativeSettings.openIOS({
                option: IOSSettings.App
            }).then((result) => {
                if (!result.status) {
                    this._infomessageService.dispatchErrorMessage(this._settingsOpenFailMessage);
                }
            });
        }
        this._updatePushState();
    }

    get isWeb(): boolean {
        return isWeb();
    }
}
