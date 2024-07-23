import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';
import { info } from 'debugger';
import { DeviceService, SpinnerComponent } from 'harmony';
import {
    APP_SPINNER,
    AuthenticationEventType,
    AuthenticationService,
    PushNotificationService,
    SomtodayLeerlingIngelogdAccount
} from 'leerling-authentication';
import { InfoMessageService } from 'leerling-util';
import { SwitchContext } from 'leerling/store';
import { isEqual } from 'lodash-es';
import { combineLatest } from 'rxjs';
import { TabBarComponent } from '../tab-bar/tab-bar.component';

const HEADER_HEIGHT = 96;
const TAB_BAR_HEIGHT = 56;

@Component({
    selector: 'sl-home',
    standalone: true,
    imports: [CommonModule, TabBarComponent, RouterOutlet, SpinnerComponent],
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

    private previousAccountLeerling: SomtodayLeerlingIngelogdAccount = {};
    public appSpinner = inject(APP_SPINNER);

    constructor() {
        combineLatest([this._authenticationService.currentAccountLeerling$, this._authenticationService.isAuthenticationReady$])
            .pipe(takeUntilDestroyed())
            .subscribe(([currentAccountLeerling, ready]) => {
                info(
                    'SWITCHING:' +
                        ready +
                        this._formatAccountLeerling(this.previousAccountLeerling) +
                        ' - cur: ' +
                        this._formatAccountLeerling(currentAccountLeerling)
                );
                if (!ready) {
                    return;
                }

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

        this._deviceService.onDeviceChange$.pipe(takeUntilDestroyed()).subscribe(() => this.updateCssMinContentVh());
    }

    private _formatAccountLeerling(accountLeerling: SomtodayLeerlingIngelogdAccount): string {
        return (
            ' (' + accountLeerling.sessionIdentifier?.UUID + ' - ' + accountLeerling.leerling?.id + ' ' + accountLeerling.leerling?.nn + ')'
        );
    }

    ngOnInit() {
        this.updateCssMinContentVh();
    }

    private updateCssMinContentVh() {
        document.documentElement.style.setProperty(
            '--min-content-vh',
            `calc(100vh - ${
                this._deviceService.isDesktop() ? HEADER_HEIGHT : HEADER_HEIGHT + TAB_BAR_HEIGHT
            }px - var(--safe-area-inset-top) - var(--safe-area-inset-bottom))`
        );
    }
}
