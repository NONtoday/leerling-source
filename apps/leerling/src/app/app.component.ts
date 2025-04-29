import { ViewportScroller } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    HostListener,
    Injector,
    NgZone,
    OnInit,
    ViewContainerRef,
    inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Event, NavigationError, Router, RouterOutlet, Scroll } from '@angular/router';
import Bugsnag from '@bugsnag/js';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';
import { Store } from '@ngxs/store';
import { SOMTODAY_API_CONFIG } from '@shared/utils/somtoday-api-token';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { setDefaultOptions } from 'date-fns';
import { nl } from 'date-fns/locale';
import { info } from 'debugger';
import { ModalService as HarmonyModalService, PopupService as HarmonyPopupService } from 'harmony';
import { WeergaveService } from 'leerling-account-modal';
import { AppStatusService } from 'leerling-app-status';
import {
    AuthenticationAccountRemovedEvent,
    AuthenticationEventType,
    AuthenticationService,
    OAuthIDPErrorEvent,
    PushNotificationService,
    SomtodayAccountProfiel,
    SomtodayLeerling,
    SomtodayLeerlingIngelogdAccount
} from 'leerling-authentication';
import { RouterService, SomtodayAvailabilityService } from 'leerling-base';
import { environment } from 'leerling-environment';
import {
    AccessibilityService,
    GuardableComponent,
    IHasActiveChild,
    InfoMessageService,
    ModalService,
    PopupService,
    RefreshService,
    SidebarService,
    Wizard,
    isAndroid,
    isIOS,
    isWeb,
    storeAuthRequestedUrl,
    storeInitialUrl
} from 'leerling-util';
import { AccountContextMetRechten, AvailablePushType, RechtenService, SPushAction, SanitizeRechten, SwitchContext } from 'leerling/store';
import { combineLatest, debounceTime, filter, fromEvent, pairwise, startWith } from 'rxjs';
import { getRootPath } from '../root-redirect/root-redirect.component';

const contextRemovalEvents: AuthenticationEventType[] = [
    AuthenticationEventType.ACCOUNT_REMOVED,
    AuthenticationEventType.ACCOUNT_REPLACED,
    AuthenticationEventType.CONTEXT_NOT_FOUND
];

@Component({
    selector: 'sl-root',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet]
})
export class AppComponent implements OnInit, AfterViewInit {
    private _router = inject(Router);

    private _zone = inject(NgZone);
    // TODO: Import verplaatsen. Trekt nu hele account modal binnen bij initiele bundle.
    private _somtodayApiConfig = inject(SOMTODAY_API_CONFIG);
    private _weergaveService = inject(WeergaveService);
    private _authenticationService = inject(AuthenticationService);
    private _rechtenService = inject(RechtenService);
    private _somtodayAvailabilityService = inject(SomtodayAvailabilityService);
    private _pushNotificationService = inject(PushNotificationService);
    private _accessibilityService = inject(AccessibilityService);
    private _viewportScroller = inject(ViewportScroller);
    private _routerService = inject(RouterService);
    private _appStatusService = inject(AppStatusService);
    private _refreshService = inject(RefreshService);
    private _infoMessageService = inject(InfoMessageService);
    private _destroyRef = inject(DestroyRef);

    // Home Component is nodig om het actieve hoofd-component aan op te vragen.
    private _homeComponent: IHasActiveChild | undefined;
    private _injector = inject(Injector);
    private _sidebarService = inject(SidebarService);
    private _popupService = inject(PopupService);
    private _harmonyPopupService = inject(HarmonyPopupService);
    private _modalService = inject(ModalService);
    private _store = inject(Store);

    private _previousAccountLeerling: SomtodayLeerlingIngelogdAccount = {};

    // benodigd voor sidebar
    private _viewContainerRef = inject(ViewContainerRef);
    public isOnline = this._appStatusService.isOnlineSignal();

    constructor() {
        storeAuthRequestedUrl();
        storeInitialUrl();

        this.initChunkloadErrorHandling();
        this.initBugsnag();
        this._registerPush();
        fromEvent(window, 'resize')
            .pipe(debounceTime(50), takeUntilDestroyed(), startWith(new Event('resize')))
            .subscribe(() => this._applySafeArea());
        this.initScrollOnNavigatie();
        this.handleBackEvents();

        this._somtodayAvailabilityService.registerAvailabilityHandler();

        this._authenticationService.events$.pipe(takeUntilDestroyed()).subscribe((next) => {
            if (contextRemovalEvents.includes(next.type)) {
                this._authenticationService._clearCaches();
            }
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
                    if (environment.debug)
                        Bugsnag.notify('Authentication-event: IDP_ERROR: ' + (next as OAuthIDPErrorEvent).humanReadableErrorMessage);
                    break;
                }
                default:
                    if (environment.debug) Bugsnag.notify('Authentication-event: ' + AuthenticationEventType[next.type]);
            }
        });
        this._rechtenService
            .getAccountContextMetRechten()
            .pipe(takeUntilDestroyed(), pairwise())
            .subscribe((rechten: [AccountContextMetRechten, AccountContextMetRechten]) => {
                const eerdereRechten = rechten[0];
                const huidigeRechten = rechten[1];
                if (
                    eerdereRechten.localAuthenticationContext !== huidigeRechten.localAuthenticationContext ||
                    !eerdereRechten.rechten ||
                    !huidigeRechten.rechten ||
                    eerdereRechten.leerlingId !== huidigeRechten.leerlingId
                )
                    return;

                const gewijzigdeRechten: string[] = [];
                if (eerdereRechten.rechten.huiswerkBekijkenAan && !huidigeRechten.rechten.huiswerkBekijkenAan)
                    gewijzigdeRechten.push('de studiewijzer');
                if (eerdereRechten.rechten.leermiddelenAan && !huidigeRechten.rechten.leermiddelenAan)
                    gewijzigdeRechten.push('leermiddelen');
                if (eerdereRechten.rechten.cijfersBekijkenAan && !huidigeRechten.rechten.cijfersBekijkenAan)
                    gewijzigdeRechten.push('cijfers');
                if (eerdereRechten.rechten.roosterBekijkenAan && !huidigeRechten.rechten.roosterBekijkenAan)
                    gewijzigdeRechten.push('het rooster');
                if (eerdereRechten.rechten.berichtenBekijkenAan && !huidigeRechten.rechten.berichtenBekijkenAan)
                    gewijzigdeRechten.push('berichten');
                if (gewijzigdeRechten.length > 0) {
                    if (gewijzigdeRechten.length === 1) this._rechtUnavailableMessage(gewijzigdeRechten.join(', '));
                    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                    else this._rechtUnavailableMessage(gewijzigdeRechten.slice(0, -1).join(', ') + ' en ' + gewijzigdeRechten.slice(-1));
                }
            });

        combineLatest([
            this._authenticationService.currentAccountLeerling$.pipe(takeUntilDestroyed()),
            this._authenticationService.authenticationState$
        ]).subscribe(([currentAccountLeerling, status]) => {
            if (status === 'AUTH_INIT') {
                return;
            }
            info(
                'SWITCHING:' +
                    this._formatAccountLeerling(this._previousAccountLeerling) +
                    ' - cur: ' +
                    this._formatAccountLeerling(currentAccountLeerling)
            );

            if (
                this._previousAccountLeerling.sessionIdentifier?.UUID !== currentAccountLeerling.sessionIdentifier?.UUID ||
                this._previousAccountLeerling.leerling?.id !== currentAccountLeerling.leerling?.id ||
                this._previousAccountLeerling.accountUUID !== currentAccountLeerling.accountUUID
            ) {
                info(
                    `CurrentLeerling? ${currentAccountLeerling.leerling?.id}, AccountUUID: ${currentAccountLeerling.accountUUID}, AuthenticationContext: ${currentAccountLeerling.sessionIdentifier?.UUID}`
                );
                this._store.dispatch(
                    new SwitchContext(
                        currentAccountLeerling.sessionIdentifier?.UUID ?? 'UNKNOWN',
                        currentAccountLeerling.accountUUID,
                        currentAccountLeerling.leerling?.id,
                        this._previousAccountLeerling.accountUUID === undefined
                    )
                );
                this._previousAccountLeerling = currentAccountLeerling;
                this._store.dispatch(new SanitizeRechten(this._authenticationService.beschikbareSessionIdentifiers));
            }
        });
    }

    onRouterActivate(childComponent: any) {
        const hasActiveChildComponent = childComponent as IHasActiveChild;
        if (hasActiveChildComponent.getChildComponent !== undefined) {
            this._homeComponent = childComponent;
        }
    }

    private _formatAccountLeerling(accountLeerling: SomtodayLeerlingIngelogdAccount): string {
        return (
            ' (' + accountLeerling.sessionIdentifier?.UUID + ' - ' + accountLeerling.leerling?.id + ' ' + accountLeerling.leerling?.nn + ')'
        );
    }

    /**
     * Handelt back-events (bv back-swipe) af op mobiele devices.
     * Indien er een sidebar/popup/modal open is, die sluiten, anders terug en als je op je 'home' bent de app sluiten.
     */
    private handleBackEvents() {
        App.addListener('backButton', () => this.back());
    }

    back() {
        // Zorgt ervoor dat als we ergens aan het typen waren, dat de 'navigation'-action van keyboard af gaat.
        this._accessibilityService.onClicked();

        if (this._popupService.isPopupOpen()) {
            this._popupService.closeLastOpenedPopup();
            return;
        }

        if (this._harmonyPopupService.isPopupOpen()) {
            this._harmonyPopupService.closeLastOpenedPopup();
            return;
        }

        // We kunnen de harmony-modal-service niet rechtstreeks injecten, omdat we dan een inject-cirkel referentie krijgen.
        // Daarom injecten we hem hier pas met de injector.
        const harmonyModalService = this._injector.get(HarmonyModalService);
        if (harmonyModalService.isOpen()) {
            harmonyModalService.backSwipeClose();
            return;
        }

        if (this._modalService.isOpen()) {
            this._modalService.animateAndClose();
            return;
        }

        if (this._sidebarService.isSidebarOpen()) {
            this._sidebarService.requestBackNavigation();
            return;
        }

        const path = window.location.pathname;
        const rootPath = '/' + getRootPath(this._rechtenService.getCurrentAccountRechtenSnapshot());
        if ((path === rootPath || ['/login'].includes(path)) && isAndroid()) {
            App.exitApp();
            return;
        }

        const childComponent = this._homeComponent?.getChildComponent();
        const wizard = childComponent as Wizard;
        if (wizard?.isAtFirstStep !== undefined && !wizard.isAtFirstStep()) {
            wizard.goToPreviousStep();
        } else if ((childComponent as GuardableComponent)?.canDeactivate !== undefined) {
            // er is een guard, ga pas terug als de gebruiker dat goed vindt.
            (childComponent as GuardableComponent).canDeactivate().subscribe((canDeactivate) => {
                if (canDeactivate) {
                    window.history.back();
                }
            });
        } else {
            window.history.back();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async ngOnInit() {
        this._somtodayApiConfig.apiUrl = environment.apiUrl;
        this._applySafeArea();
        this._registerAppLinks();
        await this._weergaveService.initializeFromPreferences();
        environment.setDebug(!environment.production);

        setDefaultOptions({ locale: nl, weekStartsOn: 1 });
        this._appStatusService.guardVersionSupported();
    }

    private initChunkloadErrorHandling() {
        this._router.events
            .pipe(
                filter((event) => event instanceof NavigationError),
                takeUntilDestroyed()
            )
            .subscribe((event) => {
                if (event.error instanceof Error && event.error.name == 'ChunkLoadError') {
                    if (this.isOnline()) {
                        this.windowAssign(`${window.location.protocol}//${window.location.host}${event.url}`);
                    } else {
                        this._infoMessageService.dispatchErrorMessage(
                            'Deze functionaliteit is op dit moment niet beschikbaar, omdat je offline werkt.'
                        );
                    }
                }
            });
    }

    windowAssign(url: string) {
        window.location.assign(url);
    }

    private _registerPush() {
        this._pushNotificationService
            .registerPushnotifications()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((pushnotificationResult) => {
                if (!pushnotificationResult) return;

                const { pushAction, verzorgerLeerlingAccountData } = pushnotificationResult;

                if (verzorgerLeerlingAccountData && this.isOnline()) {
                    return this._switchProfileAndRoute(
                        pushAction,
                        verzorgerLeerlingAccountData.verzorgerProfiel,
                        verzorgerLeerlingAccountData.leerling
                    );
                } else {
                    return this.determineRoute(pushAction);
                }
            });
    }

    private _switchProfileAndRoute(pushAction: SPushAction, verzorgerProfiel: SomtodayAccountProfiel, leerling: SomtodayLeerling): void {
        this._authenticationService.requestSwitchToProfile(verzorgerProfiel.sessionIdentifier, leerling);
        return this.determineRoute(pushAction);
    }

    private determineRoute(pushAction: SPushAction): void {
        // Bij notificaites heb je rechten, skip de check om timing issues te voorkomen.
        this._rechtenService.skipRoutePermissionCheck();
        switch (pushAction.type) {
            case AvailablePushType.INLEVERPERIODEBERICHT:
                this._routerService.routeToStudiewijzer(pushAction.entityId, pushAction.datum, 'Reacties');
                break;
            case AvailablePushType.BERICHTEN:
                this._routerService.routeToBerichten(pushAction.entityId);
                break;
            case AvailablePushType.CIJFERS:
                this._routerService.routeToCijfers(pushAction.entityId);
                break;
            case AvailablePushType.AFWEZIGHEID:
                this._routerService.routeToAfwezigheid();
                break;
        }
    }

    ngAfterViewInit(): void {
        SplashScreen.hide({ fadeOutDuration: 500 });
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
                    leerlingNummer: accountLeerling.leerling?.nr,
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
                // Catch om te zorgen dat het niets doet crashen
                if (isIOS()) {
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    Browser.close().catch(() => {});
                }
            });
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        App.addListener('resume', async () => {
            if ((await this._authenticationService.hasChangedContext()) && isWeb()) {
                window.location.reload();
                return;
            }
            await this._zone.run(async () => await this._authenticationService.reinitialiseIfInvalid());
            if (this._authenticationService.isCurrentContextLoggedIn) {
                await this._pushNotificationService.setupPushNotification();
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

    private _rechtUnavailableMessage(humanReadableRecht: string) {
        this._infoMessageService.dispatchInfoMessage(`Je kunt ${humanReadableRecht} niet meer zien, omdat je school het heeft uitgezet.`);
    }
}
