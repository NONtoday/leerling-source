import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AvatarComponent, IconDirective, OverlayService } from 'harmony';
import { IconPersoonToevoegen, IconSchool, IconSettings, IconYesRadio, provideIcons } from 'harmony-icons';
import { AppStatusService } from 'leerling-app-status';
import { AuthenticationService, SessionIdentifier, SomtodayLeerling } from 'leerling-authentication';
import { PopupComponent, RefreshReason, onRefresh } from 'leerling-util';

@Component({
    selector: 'sl-leerling-switcher',
    standalone: true,
    templateUrl: './leerling-switcher.component.html',
    styleUrls: ['./leerling-switcher.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, PopupComponent, IconDirective, AvatarComponent, A11yModule],
    providers: [provideIcons(IconYesRadio, IconPersoonToevoegen, IconSettings, IconSchool)]
})
export class LeerlingSwitcherComponent {
    private _authService = inject(AuthenticationService);
    private _overlayService = inject(OverlayService);

    availableAccounts = toSignal(this._authService.beschikbareProfielen$, { requireSync: true });
    currentAccountLeerling = toSignal(this._authService.currentAccountLeerling$, { requireSync: true });

    isOnline = inject(AppStatusService).isOnlineSignal();

    constructor() {
        onRefresh((reason) => {
            if (reason === RefreshReason.LEERLING_SWITCH) {
                // switch actie is compleet: sluit de popup
                this._overlayService.closeAll();
            }
        });
    }

    switchLeerling(sessionIdentifier: SessionIdentifier, leerling: SomtodayLeerling) {
        if (this.isOnline().valueOf()) this._authService.requestSwitchToProfile(sessionIdentifier, leerling);
    }

    addNewAccount() {
        this._authService.requestAddContextAndLogin();
    }

    initialen(leerling: SomtodayLeerling) {
        return leerling?.nn?.substring(0, 1)?.toUpperCase();
    }
}
