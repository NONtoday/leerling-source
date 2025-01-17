import { AsyncPipe, ViewportScroller } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, HostListener, NgZone, OnInit, ViewContainerRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Event, Router, RouterOutlet, Scroll } from '@angular/router';
import Bugsnag from '@bugsnag/js';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Store } from '@ngxs/store';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { setDefaultOptions } from 'date-fns';
import { nl } from 'date-fns/locale';
import { info } from 'debugger';
import { SpinnerComponent } from 'harmony';
import { WeergaveService } from 'leerling-account-modal';
import { AppStatusService } from 'leerling-app-status';
import {
    AuthenticationAccountRemovedEvent,
    AuthenticationEventType,
    AuthenticationService,
    OAuthIDPErrorEvent,
    PushNotificationService
} from 'leerling-authentication';
import { RouterService, SomtodayAvailabilityService } from 'leerling-base';
import { environment } from 'leerling-environment';
import { RequestService } from 'leerling-request';
import { AccessibilityService, RefreshService, isIOS, isWeb } from 'leerling-util';
import { AvailablePushType, RechtenService, SharedSelectors } from 'leerling/store';
import { Observable, combineLatest, debounceTime, filter, fromEvent, map, pairwise, startWith } from 'rxjs';

@Component({
    selector: 'sl-root',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [RouterOutlet, AsyncPipe, SpinnerComponent]
})
export class AppComponent implements OnInit, AfterViewInit {
    private _router = inject(Router);
    private _zone = inject(NgZone);
    // TODO: Import verplaatsen. Trekt nu hele account modal binnen bij initiele bundle.
    private _weergaveService = inject(WeergaveService);
    private _authenticationService = inject(AuthenticationService);
    private _requestService = inject(RequestService);
    private _store: Store = inject(Store);
    private _rechtenService = inject(RechtenService);
    private _somtodayAvailabilityService = inject(SomtodayAvailabilityService);
    private _pushNotificationService = inject(PushNotificationService);
    private _accessibilityService = inject(AccessibilityService);
    private _viewportScroller = inject(ViewportScroller);
    private _routerService = inject(RouterService);
    private _appStatusService = inject(AppStatusService);
    private _refreshService = inject(RefreshService);

    // benodigd voor sidebar
    private _viewContainerRef = inject(ViewContainerRef);

    public offline: Observable<boolean>;
    public isWeb = isWeb();
    public idpUrl = environment.idpIssuer;

    constructor() {
        this.initBugsnag();
        this._registerPush();
        fromEvent(window, 'resize')
            .pipe(debounceTime(50), takeUntilDestroyed(), startWith(new Event('resize')))
            .subscribe(() => this._applySafeArea());
        this.offline = this._store.select(SharedSelectors.getConnectionStatus()).pipe(map((state) => !state.isOnline));
        this.initScrollOnNavigatie();
        this._somtodayAvailabilityService.registerAvailabilityHandler();
        this._authenticationService.events$.pipe(takeUntilDestroyed()).subscribe((next) => {
            // Log events naar bugsnag.
            // We loggen dingen als 'MEDEWERKER_UNSUPPORTED' ook --> Als dit vaak gebeurt,
            // dan is er wel een bepaalde behoefte waarin we niet voldoen.
            switch (next.type) {
                // Benoem welke type niet naar bugsnag gaan.
                // De rest (en ook eventueel nieuwe typen) gaan dan automatisch wel.
                case AuthenticationEventType.INITIALIZED:
                case AuthenticationEventType.LEERLING_SWITCHED:
                case AuthenticationEventType.CURRENT_STATE_AUTHENTICATED:
                case AuthenticationEventType.ACCOUNT_SWITCHED:
                    break;
                case AuthenticationEventType.TOKEN_RECEIVED:
                    this._rechtenService.updateRechten();
                    break;
                case AuthenticationEventType.ACCOUNT_REMOVED:
                    this._removeRechtenVoor(next as AuthenticationAccountRemovedEvent);
                    break;
                case AuthenticationEventType.IDP_ERROR: {
                    Bugsnag.notify('Authentication-event: IDP_ERROR: ' + (next as OAuthIDPErrorEvent).humanReadableErrorMessage);
                    break;
                }
                default:
                    Bugsnag.notify('Authentication-event: ' + AuthenticationEventType[next.type]);
            }
        });
    }

    async ngOnInit() {
        this._requestService.rootUrl = environment.apiUrl;
        this._applySafeArea();
        this._registerAppLinks();
        await this._weergaveService.initializeFromPreferences();
        environment.setDebug(!environment.production);

        setDefaultOptions({ locale: nl, weekStartsOn: 1 });
        this._appStatusService.guardVersionSupported();
    }

    private _registerPush() {
        this._pushNotificationService.setupListenersOnly();
        this._pushNotificationService.clickedPushNotications.pipe(takeUntilDestroyed()).subscribe((pushAction) => {
            switch (pushAction.type) {
                case AvailablePushType.BERICHTEN:
                    this._routerService.routeToBerichten();
                    break;
                case AvailablePushType.CIJFERS:
                    this._routerService.routeToCijfers();
                    break;
                default:
                    break;
            }
        });
    }

    ngAfterViewInit(): void {
        SplashScreen.hide();
    }

    initBugsnag() {
        combineLatest([this._authenticationService.currentProfiel$, this._authenticationService.currentAccountLeerling$])
            .pipe(takeUntilDestroyed())
            .subscribe(([profiel, accountLeerling]) => {
                Bugsnag.setUser(profiel?.accountUUID);
                Bugsnag.addMetadata('appcontext', {
                    school: profiel?.schoolnaam,
                    affiliation: profiel?.affiliation,
                    leerling: accountLeerling.leerling?.id,
                    sessionIdentifier: profiel?.sessionIdentifier
                });
            });

        this._appStatusService
            .getVersion$()
            .pipe(takeUntilDestroyed())
            .subscribe((version) => {
                Bugsnag.addMetadata('devcontext', { version: version });
            });
    }

    private _applySafeArea() {
        if (isIOS()) {
            SafeArea.getSafeAreaInsets().then(({ insets }) => {
                document.documentElement.style.setProperty('--safe-area-inset-top', `${insets.top}px`);
                document.documentElement.style.setProperty('--safe-area-inset-right', `${insets.right}px`);
                document.documentElement.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`);
                document.documentElement.style.setProperty('--safe-area-inset-left', `${insets.left}px`);
            });
        }
    }

    private _registerAppLinks() {
        App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
            this._zone.run(() => {
                info(`Event url: ${event.url}`);
                const locationPath = event.url.split(/nl\.topicus\.somtoday\.leerling(:443|:8080|:80)?/).pop();
                info(`Gevonden redirect path: ${locationPath}`);
                if (locationPath) {
                    this._router.navigateByUrl(locationPath).then((result) => {
                        info(`Result of route ${result}`);
                    });
                }
            });
        });

        App.addListener('resume', () => {
            this._zone.run(async () => await this._authenticationService.reinitialiseIfInvalid());
            if (this._authenticationService.isCurrentContextLoggedIn) {
                this._pushNotificationService.setupPushNotification();
                this._refreshService.resuming();
            }
        });
    }

    /**
     * Reset de scrollpositie bij navigatie naar een nieuwe url.
     * Restore de scrollpositie bij een browser back event.
     * Scroll naar een anchor bij een anchor navigatie.
     * Scroll niet als alleen de queryparams van de url veranderen.
     *
     * Dit is een alternatieve implemenatie van de Angular router scroll position restoration,
     * aangezien queryparams wijzigen gezien wordt als nieuwe url en daarmee de scrollpositie reset.
     */
    private initScrollOnNavigatie() {
        this._router.events
            .pipe(
                filter((event: Event): event is Scroll => event instanceof Scroll),
                pairwise(),
                takeUntilDestroyed()
            )
            .subscribe((events: Scroll[]) => {
                const previous = events[0];
                const current = events[1];
                if (current.position) {
                    // Back navigatie, forward navigatie heeft nog geen scrollpositie
                    this._viewportScroller.scrollToPosition(current.position);
                } else if (current.anchor) {
                    // Anchor navigatie
                    this._viewportScroller.scrollToAnchor(current.anchor);
                } else {
                    const previousUrl = previous.routerEvent.url.split('?')[0];
                    const currentUrl = current.routerEvent.url.split('?')[0];

                    // Scroll alleen als de url los van de queryparams van elkaar afwijken
                    if (previousUrl !== currentUrl) {
                        this._viewportScroller.scrollToPosition([0, 0]);
                    }
                }
            });
    }

    /**********************************************************************************************
     *                                                                                            *
     *                                       Accessibility                                        *
     *                                                                                            *
     **********************************************************************************************/

    @HostListener('window:keyup', ['$event'])
    keyUpEvent(e: KeyboardEvent) {
        this._accessibilityService.onKeyUp(e);
    }

    @HostListener('window:mouseup')
    @HostListener('window:touchend')
    onClicked() {
        this._accessibilityService.onClicked();
    }

    private _removeRechtenVoor(event: AuthenticationAccountRemovedEvent) {
        if (event && event.previousSessionIdentifier) {
            this._rechtenService.removeRechten(event.previousSessionIdentifier.UUID);
        }
    }
}
