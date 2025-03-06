import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';
import { ButtonComponent, DeviceService, ModalService, SpinnerComponent } from 'harmony';
import { APP_SPINNER, AuthenticationEventType, AuthenticationService, PushNotificationService } from 'leerling-authentication';
import { DeploymentConfiguration, environment } from 'leerling-environment';
import {
    AccessibilityService,
    IHasActiveChild,
    InfoMessageService,
    isWeb,
    LandelijkeMededelingenService,
    RefreshService
} from 'leerling-util';
import { SharedSelectors } from 'leerling/store';
import { ToastrService } from 'ngx-toastr';
import { ONBOARDING_LOCALSTORAGE_KEY, ONBOARDING_MODAL_SETTINGS, OnboardingSplashComponent } from 'onboarding-splash';
import { combineLatest, filter } from 'rxjs';

const HEADER_HEIGHT = 64;
const TAB_BAR_HEIGHT = 56;

@Component({
    selector: 'sl-home',
    imports: [CommonModule, RouterOutlet, SpinnerComponent, ButtonComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, IHasActiveChild {
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
    private _landelijkeMededelingenService = inject(LandelijkeMededelingenService);
    private _activeChildComponent: any;
    public appSpinner = inject(APP_SPINNER);

    constructor() {
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
        this._landelijkeMededelingenService.refreshLandelijkeMededelingen();
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

    onRouterActivate(childComponent: any) {
        this._activeChildComponent = childComponent;
    }

    public getChildComponent(): any {
        return this._activeChildComponent;
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
        if (!isWeb() && this._deviceService.isPhoneOrTabletPortrait() && !localStorage[ONBOARDING_LOCALSTORAGE_KEY]) {
            this._modalService.modal({
                component: OnboardingSplashComponent,
                inputs: {
                    isVerzorger: this._authenticationService.isCurrentContextOuderVerzorger
                },
                settings: ONBOARDING_MODAL_SETTINGS
            });
        }
    }

    goToContent() {
        document.getElementById('mainContent')?.focus();
        this._accessibilityService.goToContent();
    }
}
