import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngxs/store';
import { ButtonComponent, DeviceService, IconDirective, SpinnerComponent } from 'harmony';
import { IconSomtoday, provideIcons } from 'harmony-icons';
import { environment } from 'leerling-environment';
import { InfoMessageService, setHref } from 'leerling-util';
import { AddErrorMessage } from 'leerling/store';
import { Observable, Subscription } from 'rxjs';
import {
    AffiliationDoesNotAllowMultipleContexts,
    AuthenticatedSuccessEvent,
    AuthenticationEvent,
    MedewerkerNotAllowedEvent,
    OAuthIDPErrorEvent,
    OAuthRemovedDuplicateContextEvent
} from '../models/authentication.models';
import { PushNotificationService } from '../pushnotification/push-notification.service';
import { AuthenticationService } from '../services/authentication.service';
import { SsoService } from '../services/sso.service';

export const AFFILIATION_ERROR =
    'Je bent nog ingelogd als medewerker in Somtoday. Somtoday Leerling & Ouder is niet beschikbaar voor medewerkers.';
export const GENERAL_ERROR = 'Er is iets mis gegaan.';

@Component({
    selector: 'sl-oauth-callback',
    templateUrl: './oauth-callback.component.html',
    styleUrls: ['./oauth-callback.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, SpinnerComponent, IconDirective, ButtonComponent],
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

    public inlogServiceDeskUrl = 'https://somtoday-servicedesk.zendesk.com/hc/nl/articles/26527007105169-Hulp-bij-inloggen';

    // Observables
    public isDesktop$ = this._deviceService.isDesktop$;

    public message: WritableSignal<string | undefined> = signal(undefined);
    public tryAgain = false;
    public toonSomtodayKnop = false;
    private _timeoutId?: ReturnType<typeof setInterval>;
    private _authenticationEvents$: Observable<AuthenticationEvent>;
    private _authenticationSubscription: Subscription;
    public _isAuthenticationReady = false;

    private static numberOfClicks = 0;

    constructor() {
        this._authenticationEvents$ = this._authenticationService.events$.pipe(takeUntilDestroyed());
        this._authenticationSubscription = this.subscribeToEvents();
        this._authenticationService.isAuthenticationReady$.pipe(takeUntilDestroyed()).subscribe((isAuthenticationReady) => {
            this._isAuthenticationReady = isAuthenticationReady;
            // wanneer we niet meer naar events luisteren omdat er een error message getoond wordt, maar wel readyState is (andere sessie), moeten we de gebruiker alsnog doorsturen
            if (this._authenticationSubscription.closed && this._isAuthenticationReady) {
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

    private subscribeToEvents(): Subscription {
        return this._authenticationEvents$.subscribe((next) => {
            if (next instanceof OAuthIDPErrorEvent) {
                this.message.set(next.humanReadableErrorMessage);
                this.tryAgain = true;
            } else if (next instanceof MedewerkerNotAllowedEvent) {
                this.message.set(AFFILIATION_ERROR);
                this.toonSomtodayKnop = true;
                if (next.hasOtherContextAvailable) {
                    this._infoMessageService.dispatchErrorMessage(
                        'Je kan geen medewerkeraccounts toevoegen, alleen ouder- of verzorgeraccounts zijn toegestaan.'
                    );
                    this._router.navigateByUrl('/');
                    return;
                }
                this._authenticationSubscription.unsubscribe();
                if (this._timeoutId) clearTimeout(this._timeoutId);
            } else if (next instanceof AuthenticatedSuccessEvent) {
                this._ssoService.saveAuthenticationMoment();

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
    }
    tryAgainNow() {
        OauthCallbackComponent.numberOfClicks++;
        if (OauthCallbackComponent.numberOfClicks === 5) {
            // Er is al 5x geklikt, dat is wel erg vaak. Verwijder alle login-info en begin opnieuw.
            OauthCallbackComponent.numberOfClicks = 0;
            this._authenticationService.purge();
            environment.clear();
        }

        if (this._timeoutId) clearTimeout(this._timeoutId);
        this.tryAgain = false;
        this.message.set(undefined);
        this._authenticationSubscription = this.subscribeToEvents();
        this._authenticationService.startLoginFlowOnCurrentContext(true);
    }

    naarSomtoday() {
        setHref(environment.idpIssuer);
    }

    ngOnDestroy() {
        if (this._timeoutId) {
            clearInterval(this._timeoutId);
        }
    }
}
