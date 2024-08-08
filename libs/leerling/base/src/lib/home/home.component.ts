import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';
import { info } from 'debugger';
import { ButtonComponent, DeviceService, ModalService, SpinnerComponent } from 'harmony';
import {
    APP_SPINNER,
    AuthenticationEventType,
    AuthenticationService,
    PushNotificationService,
    SomtodayLeerlingIngelogdAccount
} from 'leerling-authentication';
import { DeploymentConfiguration, environment } from 'leerling-environment';
import { AccessibilityService, InfoMessageService, isWeb, RefreshService } from 'leerling-util';
import { SanitizeRechten, SharedSelectors, SwitchContext } from 'leerling/store';
import { isEqual } from 'lodash-es';
import { ToastrService } from 'ngx-toastr';
import { ONBOARDING_LOCALSTORAGE_KEY, ONBOARDING_MODAL_SETTINGS, OnboardingSplashComponent } from 'onboarding-splash';
import { combineLatest, filter } from 'rxjs';
import { TabBarComponent } from '../tab-bar/tab-bar.component';

const HEADER_HEIGHT = 64;
const TAB_BAR_HEIGHT = 56;

@Component({
    selector: 'sl-home',
    standalone: true,
    imports: [CommonModule, TabBarComponent, RouterOutlet, SpinnerComponent, ButtonComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
    // services injects
    private _authenticationService = inject(AuthenticationService);
    private _deviceService = inject(DeviceService);
    private _store = inject(Store);
    private _infomessageService = inject(InfoMessageService);
    private _pushNotificationService = inject(PushNotificationService);
    private _refreshService = inject(RefreshService);
    private _modalService = inject(ModalService);
    private _toastr = inject(ToastrService);
    private _accessibilityService = inject(AccessibilityService);

    private previousAccountLeerling: SomtodayLeerlingIngelogdAccount = {};
    public appSpinner = inject(APP_SPINNER);

    constructor() {
        this._authenticationService.currentAccountLeerling$.pipe(takeUntilDestroyed()).subscribe((currentAccountLeerling) => {
            info(
                'SWITCHING:' +
                    this._formatAccountLeerling(this.previousAccountLeerling) +
                    ' - cur: ' +
                    this._formatAccountLeerling(currentAccountLeerling)
            );

            if (
                !isEqual(this.previousAccountLeerling.sessionIdentifier, currentAccountLeerling.sessionIdentifier) ||
                this.previousAccountLeerling.leerling?.id !== currentAccountLeerling.leerling?.id ||
                this.previousAccountLeerling.accountUUID !== currentAccountLeerling.accountUUID
            ) {
                this.previousAccountLeerling = currentAccountLeerling;
                info(
                    `CurrentLeerling? ${currentAccountLeerling.leerling?.id}, AccountUUID: ${currentAccountLeerling.accountUUID}, AuthenticationContext: ${currentAccountLeerling.sessionIdentifier?.UUID}`
                );
                this._store.dispatch(
                    new SwitchContext(
                        currentAccountLeerling.sessionIdentifier?.UUID ?? 'UNKNOWN',
                        currentAccountLeerling.accountUUID,
                        currentAccountLeerling.leerling?.id
                    )
                );
                this._store.dispatch(new SanitizeRechten(this._authenticationService.beschikbareSessionIdentifiers));
            }
        });
        this._authenticationService.events$.pipe(takeUntilDestroyed()).subscribe((next) => {
            switch (next.type) {
                case AuthenticationEventType.ACCOUNT_REMOVED:
                    this._infomessageService.dispatchInfoMessage('Een van je accounts is verwijderd omdat de sessie niet meer geldig was.');
                    break;
                case AuthenticationEventType.TOKEN_RECEIVED:
                    this._pushNotificationService.setupPushNotification();
                    break;
                case AuthenticationEventType.FAILED_TO_INITIALIZE:
                    this._infomessageService.dispatchErrorMessage('We konden Somtoday niet bereiken, je werkt nu offline.');
                    break;
                case AuthenticationEventType.DEDUPLICATED:
                    this._infomessageService.dispatchInfoMessage('Je was al ingelogd met dit account, er is niks gewijzigd.');
                    break;
            }
        });
        combineLatest([this._authenticationService.authenticationState$, this._store.select(SharedSelectors.getConnectionStatus())])
            .pipe(
                takeUntilDestroyed(),
                filter(([status, next]) => next.isOnline && 'READY' === status)
            )
            .subscribe(() => {
                this._refreshService.resuming();
            });
        this._deviceService.onDeviceChange$.pipe(takeUntilDestroyed()).subscribe(() => this.updateCssMinContentVh());
    }

    private _formatAccountLeerling(accountLeerling: SomtodayLeerlingIngelogdAccount): string {
        return (
            ' (' + accountLeerling.sessionIdentifier?.UUID + ' - ' + accountLeerling.leerling?.id + ' ' + accountLeerling.leerling?.nn + ')'
        );
    }

    ngOnInit() {
        this.updateCssMinContentVh();
        this.showOnboardingSplash();

        if (
            isWeb() &&
            environment.config in
                [
                    DeploymentConfiguration.nightly,
                    DeploymentConfiguration.acceptatie,
                    DeploymentConfiguration.test,
                    DeploymentConfiguration.productie
                ]
        ) {
            this._toastr.info(
                `Je bekijkt de bètaversie van Somtoday. <a href="${environment.idpIssuer}" tabindex="-1">Klik hier voor de stabiele versie</a>`,
                undefined,
                {
                    disableTimeOut: true
                }
            );
        }
    }

    private updateCssMinContentVh() {
        document.documentElement.style.setProperty(
            '--min-content-vh',
            `calc(100vh - ${
                this._deviceService.isDesktop() ? HEADER_HEIGHT : HEADER_HEIGHT + TAB_BAR_HEIGHT
            }px - var(--safe-area-inset-top) - var(--safe-area-inset-bottom))`
        );
    }

    private showOnboardingSplash() {
        if (!isWeb() && !localStorage[ONBOARDING_LOCALSTORAGE_KEY]) {
            this._modalService.modal(
                OnboardingSplashComponent,
                {
                    isVerzorger: this._authenticationService.isCurrentContextOuderVerzorger
                },
                ONBOARDING_MODAL_SETTINGS
            );
        }
    }

    goToContent() {
        document.getElementById('mainContent')?.focus();
        this._accessibilityService.goToContent();
    }
}
