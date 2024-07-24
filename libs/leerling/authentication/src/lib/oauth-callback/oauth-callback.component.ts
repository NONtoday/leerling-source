import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngxs/store';
import { ButtonComponent, ClassOnClickDirective, DeviceService, IconDirective, SpinnerComponent } from 'harmony';
import { IconSomtoday, provideIcons } from 'harmony-icons';
import { environment } from 'leerling-environment';
import { InfoMessageService } from 'leerling-util';
import { AddErrorMessage } from 'leerling/store';
import { Subscription } from 'rxjs';
import {
    AffiliationDoesNotAllowMultipleContexts,
    AuthenticatedSuccessEvent,
    MedewerkerNotAllowedEvent,
    OAuthIDPErrorEvent,
    OAuthRemovedDuplicateContextEvent
} from '../models/authentication.models';
import { PushNotificationService } from '../pushnotification/push-notification.service';
import { AuthenticationService } from '../services/authentication.service';
import { SsoService } from '../services/sso.service';

export const AFFILIATION_ERROR =
    'Je bent nog ingelogd als medewerker in Somtoday. Deze applicatie is niet beschikbaar voor medewerkers. Ben je toch een leerling of ouder/verzorger, klik op de onderstaande knop om nogmaals in te loggen. Over tien seconden gebeurt dit automatisch.';
export const GENERAL_ERROR = 'Er is iets mis gegaan.';

@Component({
    selector: 'sl-oauth-callback',
    templateUrl: './oauth-callback.component.html',
    styleUrls: ['./oauth-callback.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, SpinnerComponent, IconDirective, ClassOnClickDirective, ButtonComponent],
    standalone: true,
    providers: [provideIcons(IconSomtoday)]
})
export class OauthCallbackComponent implements OnDestroy {
    private _router = inject(Router);
    private _authenticationService = inject(AuthenticationService);
    private _deviceService = inject(DeviceService);
    private _store = inject(Store);
    private _pushService = inject(PushNotificationService);
    private _infoMessageService: InfoMessageService = inject(InfoMessageService);
    private _ssoService = inject(SsoService);

    // Observables
    public isDesktop$ = this._deviceService.isDesktop$;

    public message: WritableSignal<string | undefined> = signal(undefined);
    public tryAgain = false;
    private _timeoutId?: ReturnType<typeof setInterval>;
    private _eventSub: Subscription;
    public _isAuthenticationReady = false;

    private static numberOfClicks = 0;

    constructor() {
        this._eventSub = this._authenticationService.events$.pipe(takeUntilDestroyed()).subscribe((next) => {
            if (next instanceof OAuthIDPErrorEvent) {
                this.message.set(next.humanReadableErrorMessage);
                this.tryAgain = true;
            } else if (next instanceof MedewerkerNotAllowedEvent) {
                this.message.set(AFFILIATION_ERROR);
                if (next.hasOtherContextAvailable) {
                    this._infoMessageService.dispatchErrorMessage(
                        'Je kan geen medewerkeraccounts toevoegen, alleen ouder- of verzorgeraccounts zijn toegestaan.'
                    );
                    this._router.navigateByUrl('/');
                    return;
                }
                this.tryAgain = true;
                this._eventSub.unsubscribe();
                if (this._timeoutId) clearTimeout(this._timeoutId);
                this._timeoutId = setTimeout(() => {
                    this._timeoutId = undefined;
                    this.tryAgainNow();
                }, 10000);
            } else if (next instanceof AuthenticatedSuccessEvent) {
                this._ssoService.saveAuthenticationMoment();

                // or saved route (for later)
                this._pushService.setupPushNotification();
                this._router.navigateByUrl('/');
            } else if (next instanceof AffiliationDoesNotAllowMultipleContexts) {
                this._store.dispatch(
                    new AddErrorMessage('Je kan geen leerlingaccounts toevoegen, alleen ouder- of verzorgeraccounts zijn toegestaan.')
                );
                this._router.navigateByUrl('/');
            } else if (next instanceof OAuthRemovedDuplicateContextEvent) {
                this._infoMessageService.dispatchInfoMessage('Je was al ingelogd met dit account, er is niks gewijzigd.');
            } else {
                // Er is schijnbaar iets aan de hand wat we niet verwachten, maar de gebuiker kan nu niets meer
                // toon in ieder geval het knopje om opnieuw in te loggen.
                // Doe dit alleen als er nog geen fout geset is en pas na 5 seconden (mochten we hier toevallig komen met een trage verbinding en er toch nog een succes optreed).
                if (!this.message()) {
                    if (this._timeoutId) clearTimeout(this._timeoutId);
                    this._timeoutId = setTimeout(() => {
                        this.message.set(GENERAL_ERROR);
                        this.tryAgain = true;
                    }, 5000);
                }
            }
        });
        this._authenticationService.isAuthenticationReady$.pipe(takeUntilDestroyed()).subscribe((isAuthenticationReady) => {
            this._isAuthenticationReady = isAuthenticationReady;
            // wanneer we niet meer naar events luisteren omdat er een error message getoond wordt, maar wel readyState is (andere sessie), moeten we de gebruiker alsnog doorsturen
            if (this._eventSub.closed && this._isAuthenticationReady) {
                if (this._timeoutId) {
                    clearInterval(this._timeoutId);
                    this._store.dispatch(
                        new AddErrorMessage('Je kan geen medewerkeraccounts toevoegen, alleen ouder- of verzorgeraccounts zijn toegestaan.')
                    );
                    this._router.navigateByUrl('/');
                }
            }
        });
    }

    tryAgainNow() {
        OauthCallbackComponent.numberOfClicks++;
        if (OauthCallbackComponent.numberOfClicks === 5) {
            // Er is al 5x geklikt, dat is wel erg vaak. Verwijder alle login-info en begin opnieuw.
            OauthCallbackComponent.numberOfClicks = 0;
            this._authenticationService.purge();
            environment.clear();
        }

        this.tryAgain = false;
        this._authenticationService.startLoginFlowOnCurrentContext(true);
    }

    ngOnDestroy() {
        if (this._timeoutId) {
            clearInterval(this._timeoutId);
        }
    }
}
