import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, IsActiveMatchOptions, Router } from '@angular/router';
import Bugsnag from '@bugsnag/js';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { AuthConfig, OAuthErrorEvent, OAuthEvent, OAuthService } from 'angular-oauth2-oidc';
import { error, info, warn } from 'debugger';
import { isPresent } from 'harmony';
import { AuthorizationHeaderService } from 'iridium-authorization-header';
import { RLeerling } from 'leerling-codegen';
import { DeploymentConfiguration, environment } from 'leerling-environment';
import { SupportedErrorTypes } from 'leerling-error-models';
import { RequestInformationBuilder, RequestService } from 'leerling-request';
import { isWeb, setHref, sortLocale } from 'leerling-util';
import { nxgsStorageKeys, RechtenService } from 'leerling/store';
import { isEqual } from 'lodash-es';
import { BehaviorSubject, catchError, defaultIfEmpty, filter, firstValueFrom, map, Observable, of, Subject, take, timeout } from 'rxjs';
import { AuthenticationState } from '../models/authentication-state';
import {
    AccountSwitchedEvents,
    Affiliation,
    AffiliationDoesNotAllowMultipleContexts,
    AuthenticatedSuccessEvent,
    AuthenticationAccountRemovedEvent,
    AuthenticationContextNotFoundEvent,
    AuthenticationEvent,
    AuthenticationEventType,
    FailedToInitializeSomtodayIDP,
    MedewerkerNotAllowedEvent,
    OAuthIDPErrorEvent,
    SessionIdentifier,
    SomtodayAccountProfiel,
    SomtodayLeerling,
    SomtodayLeerlingIngelogdAccount,
    TokenReceivedEvent
} from '../models/authentication.models';
import { InMemoryStorage } from './in-memory-storage';

export type Status = 'AUTH_INIT' | 'RESUMING' | 'SWITCHING' | 'READY' | 'ERROR';

/**
 * Deze service biedt een meta laag boven op angular-oauth2-oidc aan om zo meerdere authenticatiecontexten
 * (gebruikers die ingelogd zijn op de applicatie) aan te kunnen.
 *
 * Wanneer localStorage beschikbaar is zal deze gebruikt worden met een fallback naar een cookie (cookieStorage).
 *
 * Deze service biedt ook een `events` property aan, waarop componenten zich kunnen subscribed. Hierop komen alle events binnen die
 * angular-oauth2-oidc fired, alsmede twee toegevoegde events, OAuthBeforeSwitchContextEvent voor het detecteren van een gebruikerswissel (reset data)
 * en OAuthRemovedDuplicateContextEvent voor wanneer er een inlog actie heeft plaatsgevonden
 * voor een gebruiker waar we al een bekende context voor opgebouwd hadden.
 *
 */

@Injectable({
    providedIn: 'root'
})
export class AuthenticationService {
    private static AFFILIATION_CLAIM = 'affiliation';
    private static SUPPORTED_AFFILIATIONS: Affiliation[] = [Affiliation.LEERLING, Affiliation.PARENT_GUARDIAN];
    private static DEFAULT_ERROR_MESSAGE = 'Er is een onbekende fout opgetreden tijdens het inloggen, probeer het nogmaals.';
    private static MATCH_OPTIONS: IsActiveMatchOptions = {
        paths: 'subset',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored'
    };

    private _status$ = new BehaviorSubject<Status>('AUTH_INIT');

    // injects
    private _oauthService = inject(OAuthService);
    private _router = inject(Router);
    private _requestService = inject(RequestService);
    private _activatedRoute = inject(ActivatedRoute);
    private _authorizationHeaderService = inject(AuthorizationHeaderService);
    private _rechtenService = inject(RechtenService);

    // local metadata + storage
    private _authenticationState = inject(AuthenticationState);
    private inMemoryOauthStorage = new InMemoryStorage();

    // Observables for exposing state to components (not for authguards, use angular-oauth2-oidc directly)
    private _authEvents$ = new Subject<AuthenticationEvent>();

    // sync angular lib vs async storage handling
    private _tryRedirectAfterInit = false;
    private _isContextChanging = false;
    private _afterInitialLoading: ((value: boolean) => void) | undefined;

    // When discovery_docs (idp metadata) could not be loaded, errorOnContext will be true.
    private _errorOnContext = new BehaviorSubject<boolean>(false);

    // optional interceptor of context switch requests, for example to show a guard to the user
    private _contextSwitchRequestInterceptor?: ContextSwitchRequestInterceptor | undefined;

    constructor() {
        this.initStorage();
        this._activatedRoute.queryParams
            .pipe(
                map((params) => params['code']),
                filter(isPresent),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                if (this._oauthService.discoveryDocumentLoaded) this._tryCodeExchangeOnCurrentContext();
            });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this._oauthService.events.pipe(takeUntilDestroyed()).subscribe(async (incomingEvent: OAuthEvent) => {
            info('Incoming oauthEvent ' + JSON.stringify(incomingEvent));
            await this._authenticationState.saveCurrentSessionToStorage(this.inMemoryOauthStorage.backup());
            if (incomingEvent.type === 'discovery_document_load_error') {
                this._setErrorIfChanged(true);
                if (this._afterInitialLoading) {
                    const hasAnyAvailableSession = this._authenticationState.hasAnyAuthenticatedSession();
                    this._afterInitialLoading(hasAnyAvailableSession);
                    this._afterInitialLoading = undefined;
                    if (!hasAnyAvailableSession) {
                        if (!this._router.isActive('/login', AuthenticationService.MATCH_OPTIONS))
                            this._router.navigate(['/error'], { queryParams: { type: 'idp_down' } });
                    }
                }
            } else if (incomingEvent.type === 'token_received' && this._oauthService.hasValidAccessToken()) {
                this._authEvents$.next(new TokenReceivedEvent());
                if (await this._afterLogin()) {
                    info('Nieuw token ontvangen en account is goed');
                    this._setState('READY');
                }
            }
            if (incomingEvent instanceof OAuthErrorEvent) {
                this._setState('ERROR');
                const errorEvent = incomingEvent;
                this._authEvents$.next(
                    new OAuthIDPErrorEvent(
                        JSON.stringify(
                            errorEvent.reason ??
                                (errorEvent.type
                                    ? 'Tijdens het inloggen is er iets mis gegaan: ' + errorEvent.type
                                    : AuthenticationService.DEFAULT_ERROR_MESSAGE)
                        )
                    )
                );
            }
            if (incomingEvent.type === 'discovery_document_loaded') {
                this._setErrorIfChanged(false);
                const optionalCodeParam = this._activatedRoute.snapshot.queryParams['code'];
                if (optionalCodeParam) {
                    await this._oauthService.tryLoginCodeFlow();
                    await this._authenticationState.saveCurrentSessionToStorage(this.inMemoryOauthStorage.backup());
                } else if (this._tryRedirectAfterInit) {
                    this._tryRedirectAfterInit = false;
                    this._redirectToIDP();
                    return;
                }
                if (this._afterInitialLoading) {
                    this._afterInitialLoading(this._authenticationState.hasAnyAuthenticatedSession());
                    this._afterInitialLoading = undefined;
                }

                if (this._isCurrentProfileInInvalidState()) {
                    info('discovery_document_loaded en currentProfileInInvalidState - removeCurrentContext');
                    await this.removeCurrentContext();
                    return;
                }

                this._isContextChanging = false;
                this._authEvents$.next(new AuthenticationEvent(AuthenticationEventType.INITIALIZED));
            }
            return;
        });

        this._authorizationHeaderService.refreshError$.pipe().subscribe(() => {
            if (this._isContextChanging) return;

            this._setState('ERROR');
            const currentSessionId = this._authenticationState.getCurrentSessionIdentifier();
            this.removeCurrentContext(new AuthenticationAccountRemovedEvent(currentSessionId)).then((logoffNeeded) => {
                if (logoffNeeded) {
                    this.startLoginFlowOnCurrentContext();
                }
            });
        });
    }

    // Een profiel is in een invalid state als deze leeg is en het inloggen niet afgemaakt is.
    // Uitzonderingen zijn: login en oauth callback.
    // Login: kom je alleen als er nog geen enkel account geauthenticeerd is, context behouden anders is de nonce weg en kan er het authenticeren niet afgemaakt worden.
    // Oauth/callback: Het afronden van de huidige poging tot authenticatie.
    private _isCurrentProfileInInvalidState(): boolean {
        return (
            !this._router.isActive('/login', AuthenticationService.MATCH_OPTIONS) &&
            !this._router.isActive('/oauth/callback', AuthenticationService.MATCH_OPTIONS) &&
            !this._router.isActive('/error', AuthenticationService.MATCH_OPTIONS) &&
            !this._afterInitialLoading &&
            !this._isContextChanging &&
            this._currentProfileIsEmpty()
        );
    }

    private async _afterLogin(): Promise<boolean> {
        info('_afterLogin');
        const authEvent = this._validateAffiliation();
        if (!authEvent) {
            this._authEvents$.next(new AuthenticatedSuccessEvent());
            await this._augmentUserMetadataToContext();
            return true;
        } else {
            const hasOtherContextAvailable = this._authenticationState.getAantalAccountProfielen() > 1;
            switch (authEvent) {
                case AuthenticationEventType.MEDEWERKER_UNSUPPORTED:
                    this._setState('ERROR');
                    await this.removeCurrentContext(new MedewerkerNotAllowedEvent(hasOtherContextAvailable));
                    return false;
                case AuthenticationEventType.MULTI_LOGIN_NOT_ALLOWED:
                    this._setState('ERROR');
                    await this.removeCurrentContext(new AffiliationDoesNotAllowMultipleContexts(hasOtherContextAvailable));
                    return false;
            }
            return true;
        }
    }

    public async reinitialiseIfInvalid(): Promise<void> {
        if (this._isCurrentProfileInInvalidState()) {
            this._setState('RESUMING');
            await this.initStorage();
            this.retryDiscoveryDocument();
        }
    }

    public async switchToProfile(sessionIdentifier: SessionIdentifier, leerling: SomtodayLeerling): Promise<void> {
        this._setState('SWITCHING');
        const profile: SomtodayAccountProfiel = this._authenticationState.findCurrentAccountProfielOrError();
        const isCurrentProfile = isEqual(profile.sessionIdentifier, sessionIdentifier);
        if (isCurrentProfile) {
            await this._authenticationState.setCurrentLeerling(leerling);
            info('Switch van leerling binnen account');
            this._setState('READY');
            return;
        } else {
            const leerlingFound = this._authenticationState.hoortLeerlingBijAccount(sessionIdentifier, leerling);
            if (leerlingFound) return await this._switchContext(sessionIdentifier, leerling);
            else {
                this._authEvents$.next(new AuthenticationContextNotFoundEvent());
                info('We willen switchen maar de leerling is niet gevonden dus we switchen niet');
                this._setState('READY');
            }
        }
    }

    public startLoginFlowOnCurrentContext(forceAuth = false): void {
        if (this._oauthService.discoveryDocumentLoaded) {
            this._redirectToIDP(forceAuth);
        } else if (this._errorOnContext.value) {
            this._router.navigate(['/error'], { queryParams: { type: SupportedErrorTypes.IDP_DOWN } });
        } else {
            this._tryRedirectAfterInit = true;
        }
    }

    private async _deimpersonate(): Promise<void> {
        await firstValueFrom(
            this._requestService.post('account/deimpersonate', new RequestInformationBuilder().build()).pipe(
                defaultIfEmpty(null) // Emit null bij geen value emit voor completion (httpresponse without body)
            )
        );
        return;
    }

    public async logoffAndRemove(force = false): Promise<void | string> {
        const idToken = this._oauthService.getIdToken();
        const postLogoutRedirectUri = environment.ownBaseUri;
        const shouldStopLogout: boolean = await this._tryToRevokeTokenAndDisablePush();
        const sessionCount = this._authenticationState.getAantalAccountProfielen();
        const isImpersonated = this._rechtenService.isCurrentAccountImpersonatedSnapshot();
        if (shouldStopLogout && !force && sessionCount > 1) {
            return 'Uitloggen is op dit moment niet mogelijk omdat we Somtoday niet konden bereiken.';
        }
        this._setState('AUTH_INIT');
        if (isImpersonated) {
            await this._deimpersonate();
        }
        if (await this.removeCurrentContextAndSwitchIfLast(undefined, false)) {
            if (Capacitor.isNativePlatform()) {
                await PushNotifications.unregister().catch((error) => Bugsnag.notify(error));
            }
            if (isImpersonated) {
                return this._redirectAfterImpersonation();
            }
            this._oauthService.logOut({ id_token_hint: idToken, post_logout_redirect_uri: postLogoutRedirectUri });
            return;
        }
        return 'Uitloggen gelukt';
    }

    /**
     * returns false if token revocation was not needed OR successful, true if token revocation was needed and did not succeed.
     */
    public async _tryToRevokeTokenAndDisablePush(): Promise<boolean> {
        if (this._oauthService.hasValidAccessToken() && !isWeb()) {
            return firstValueFrom(
                this._requestService.deleteWithResponse<Response>(`accountdevices`).pipe(
                    timeout(4000),
                    map((response) => {
                        return response == null || response.status >= 500;
                    }),
                    catchError(() => of(true))
                )
            );
        }
        return false;
    }

    public isCurrentAccountImpersonated(): Observable<boolean> {
        return this._rechtenService.isCurrentAccountImpersonated();
    }

    /**
     *   Dangerous, will clear full localStorage/cookieStorage (all contexts)
     */
    public async purge(): Promise<void> {
        this.inMemoryOauthStorage.restore('{}');
        await this._authenticationState.purge();

        this._setState('AUTH_INIT');
        await this.initStorage();
    }

    private async initStorage() {
        const metadataFound = await this._authenticationState.loadMetadata();
        let sessionIdentifier: SessionIdentifier | undefined;
        if (metadataFound) {
            sessionIdentifier = this._authenticationState.getCurrentSessionIdentifier();
        } else {
            sessionIdentifier = await this._authenticationState.generatedBaseContext();
        }
        if (sessionIdentifier) await this._switchContext(sessionIdentifier);

        this._authenticationState.sanitizeStorageAPI().then(() => info('Sanitize Storage API done'));
        return;
    }

    public get beschikbareSessionIdentifiers() {
        return this._authenticationState.beschikbareSessionIdentifiers;
    }

    /**
     * Creates a new context (if current context is not empty) and switches to this context
     */
    public async createAndAuthenticateOuderVerzorger(): Promise<void> {
        if (this._currentProfileIsEmpty() || !this.isCurrentContextOuderVerzorger) return;
        this._isContextChanging = true;
        const newSessionIdentifier = await this._authenticationState.generatedBaseContext();
        this._setState('AUTH_INIT');
        return await this._switchContext(newSessionIdentifier);
    }

    private async _augmentUserMetadataToContext(): Promise<void> {
        const claimset = this._oauthService.getIdentityClaims();
        if (!claimset || !claimset['sub']) {
            warn(`Let op: authenticatie metadata voor nieuwe context niet beschikbaar, claimset of subject niet beschikbaar`);
            return;
        }

        const accountEnInstelling: string[] = this._filterAccountEnInstellingFromSubject(claimset['sub']);
        if (accountEnInstelling) {
            info('account en instelling verwerken');
            const subLeerlingen = sortLocale(this._leerlingMetadata(claimset), ['nn'], ['asc']);
            await this._authenticationState.updateCurrentAccountProfielAndRemoveDuplicates({
                accountUUID: accountEnInstelling[1],
                organisatieUUID: accountEnInstelling[0],
                isAuthenticated: true,
                voornaam: claimset['given_name'],
                affiliation: claimset[AuthenticationService.AFFILIATION_CLAIM] as Affiliation,
                schoolnaam: claimset['orgname'] || 'Onbekende school',
                subLeerlingen: subLeerlingen
            });
            await this._rechtenService.initializeRechtenSynchronous(this._authenticationState.metadata.currentSessionIdentifier?.UUID);
            await this._preFetchPasfotos(subLeerlingen);
        }

        const profiel = this._authenticationState.findCurrentAccountProfielOrError();

        // Huidige leerling en anders de eerste
        const currentLeerlingId = this._authenticationState.getCurrentLeerling()?.id;
        const currentLeerling =
            profiel.subLeerlingen?.find((leerling: SomtodayLeerling) => leerling.id === currentLeerlingId) ??
            profiel.subLeerlingen?.find((leerling) => leerling);
        if (currentLeerling) {
            await this._authenticationState.setCurrentLeerling(currentLeerling);
        }
    }

    private async _switchContext(newSessionIdentifier: SessionIdentifier, newLeerling?: SomtodayLeerling): Promise<void> {
        info('Begin _switchContext');
        if (this._errorOnContext.value) {
            this._errorOnContext.next(false);
        }

        const newAccountProfiel = this._authenticationState.findAccountProfiel(newSessionIdentifier);
        if (!newAccountProfiel) {
            info('profiel niet gevonden');
            return this._authEvents$.next(new AuthenticationContextNotFoundEvent());
        }
        const isSameSessionIdentifier = isEqual(newSessionIdentifier.UUID, this._authenticationState.getCurrentSessionIdentifier()?.UUID);
        if (!newLeerling) {
            info('Bestaande leerling');
            // Geen nieuwe leerling? Pak dan een bestaande leerling.
            if (isSameSessionIdentifier) {
                info('de huidige - pak de huidige leerling');
                newLeerling = this._authenticationState.getCurrentLeerling();
            }

            if (!newLeerling) {
                info('Pak de eerste leerling maar');
                newLeerling = newAccountProfiel.subLeerlingen.length > 0 ? newAccountProfiel.subLeerlingen[0] : undefined;
            }
        }

        this.inMemoryOauthStorage.restore(await this._authenticationState.loadSessionFromStorage(newSessionIdentifier));

        info('De inMemory-storage is geladen');

        // let angular-oauth2-oidc know we are re-initing
        this._oauthService.setStorage(this.inMemoryOauthStorage);
        this._oauthService.configure(this._createBasicAuthConfig());

        // nodig voor een refresh initial load, om de laatst bewaarde leerling terug te selecten.
        await this._authenticationState.updateMetadata({
            currentSessionIdentifier: newSessionIdentifier,
            currentLeerling: newLeerling
        });
        info('Oauth service is gerinit');
        let loginResult = false;
        try {
            info('Start wachten loadDiscoveryDocumentAndTryLogin');
            loginResult = await this._oauthService.loadDiscoveryDocumentAndTryLogin();
            info('klaar loadDiscoveryDocumentAndTryLogin');
        } catch {
            info('Switch Context login had an error, maybe network is down.');
        }

        // let op, de tryLogin is een void promise in de library, waardoor deze boolean niet doet wat we verwachten.
        if (loginResult) {
            info('We hebben een login result');
            if (!isSameSessionIdentifier) {
                this._authEvents$.next(new AccountSwitchedEvents());
            }
            info('We hebben token en rechten zijn geupdated');
            if (this._oauthService.hasValidAccessToken()) {
                this._setState('READY');
            } else if (this._authorizationHeaderService.isRefreshable()) {
                info('...maar we hebben nog geen geldig access-token. Refresh het token handmatig.');
                this._authorizationHeaderService
                    .singleRefreshFailFast()
                    .pipe(take(1))
                    .subscribe(() => {
                        if (this._oauthService.hasValidAccessToken()) {
                            info('Token-refresh succesvol, we zijn READY');
                            this._setState('READY');
                        } else {
                            info('Token-refresh niet gelukt');
                            this._setState('ERROR');
                        }
                    });
            }
        } else {
            info('geen login result - errr');
            this._setErrorIfChanged(true);
            this._authEvents$.next(new FailedToInitializeSomtodayIDP());
        }
    }

    private _setState(state: Status) {
        const currentState = this._status$.value;
        this._status$.next(state);
        info('State change: ' + currentState + ' ==> ' + state);
    }

    private _setErrorIfChanged(error: boolean): void {
        if (this._errorOnContext.value !== error) {
            this._errorOnContext.next(error);
        }
    }

    private _createBasicAuthConfig(): AuthConfig {
        return {
            showDebugInformation: true,
            clockSkewInSec: 120,
            issuer: environment.idpIssuer,
            skipIssuerCheck: true,
            strictDiscoveryDocumentValidation: false,
            requireHttps: !(DeploymentConfiguration.ontwikkel === environment.iridiumConfig),
            loginUrl: `${environment.idpIssuer}/oauth2/authorize`,
            tokenEndpoint: `${environment.idpIssuer}/oauth2/token`,
            redirectUri: environment.idpRedirectUri,
            logoutUrl: `${environment.idpIssuer}/oauth2/logout`,
            postLogoutRedirectUri: `${environment.ownBaseUri}`,
            clientId: environment.idpClientId,
            requestAccessToken: true,
            useSilentRefresh: false,
            scope: 'openid',
            responseType: 'code',
            customTokenParameters: ['somtoday_tenant', 'somtoday_api_url'],
            disableAtHashCheck: true,
            openUri: (uri: string): void => {
                info('We gaan saveSession doen vanuit _createBasicAuthConfig()');

                this._authenticationState
                    .saveCurrentSessionToStorage(this.inMemoryOauthStorage.backup())
                    .then(() => {
                        setHref(uri);
                    })
                    .catch(() => {
                        error('Could not save context.', 'authenticatie');
                        setHref(uri);
                    });
            },
            customQueryParams: {
                claims: '{"id_token":{"given_name":null, "leerlingen":null, "orgname": null, "affiliation":{"values":["student","parent/guardian"]} }}'
            }
        };
    }

    private _redirectToIDP(forceAuth = false) {
        const additionParameters: any = { scope: 'openid' };
        if (this._authenticationState.getAantalAccountProfielen() > 1 || forceAuth) {
            additionParameters['prompt'] = 'login';
            additionParameters['session'] = 'no_session';
            additionParameters['force_authn'] = true;
        }

        this._authenticationState.saveCurrentSessionToStorage(this.inMemoryOauthStorage.backup()).then(() => {
            this._oauthService.initLoginFlow(undefined, additionParameters);
        });
    }

    private _redirectAfterImpersonation(): void {
        setHref(environment.idpIssuer);
    }

    public _tryCodeExchangeOnCurrentContext(): void {
        this._oauthService.tryLoginCodeFlow();
    }

    /**
     * Will add a new context and start the authentication flow with the IDP. Checks for availability of multiaccountlogin and emits event if unavailable.
     */
    private async addContextAndLogin() {
        if (this.isCurrentContextOuderVerzorger && !this._rechtenService.isCurrentAccountImpersonatedSnapshot()) {
            this._isContextChanging = true;
            await this.createAndAuthenticateOuderVerzorger();
            this.startLoginFlowOnCurrentContext();
        } else {
            this._authEvents$.next(new AffiliationDoesNotAllowMultipleContexts());
        }
    }

    public async removeCurrentContext(event?: AuthenticationEvent): Promise<boolean> {
        return this.removeCurrentContextAndSwitchIfLast(event);
    }

    public async removeCurrentContextAndSwitchIfLast(event?: AuthenticationEvent, switchContext = true): Promise<boolean> {
        let idpLogoutNeeded = false;
        this._isContextChanging = true;
        const current = this._authenticationState.findCurrentAccountProfielOrError();
        await this._authenticationState.removeAccountProfiel(current);
        this._clearCaches();

        if (event) {
            this._authEvents$.next(event);
        }

        let sessionIdentifier = this._authenticationState.getEersteAccountProfiel()?.sessionIdentifier;
        if (!sessionIdentifier) {
            // // We hebben geen profiel: creeer er maar een.
            sessionIdentifier = await this._authenticationState.generatedBaseContext();
            idpLogoutNeeded = true;
        }

        if (sessionIdentifier) {
            if (!idpLogoutNeeded) {
                await this._switchContext(sessionIdentifier);
            }
            // bij de laatste gebruiker wisselen we niet van context, anders wordt de logout redirect gecanceld.
            else if (switchContext) {
                await this._switchContext(sessionIdentifier);
            } else {
                // nodig voor een refresh initial load, om de laatst bewaarde leerling terug te selecten.
                await this._authenticationState.updateMetadata({
                    currentSessionIdentifier: sessionIdentifier,
                    currentLeerling: undefined
                });
                await this._authenticationState.saveCurrentSessionToStorage(this.inMemoryOauthStorage.backup(), true);
            }
        }
        if (event && event.type === AuthenticationEventType.ACCOUNT_REPLACED) idpLogoutNeeded = false;
        return idpLogoutNeeded;
    }

    private _filterAccountEnInstellingFromSubject(claimsetElement: string): string[] {
        return claimsetElement ? claimsetElement.split('\\') : [];
    }

    private _validateAffiliation(): AuthenticationEventType | undefined {
        const claimset = this._oauthService.getIdentityClaims();
        if (!claimset || !claimset[AuthenticationService.AFFILIATION_CLAIM]) {
            info(`Let op: claimset of affiliation niet beschikbaar`);
            return AuthenticationEventType.MEDEWERKER_UNSUPPORTED;
        }
        const affiliation = claimset[AuthenticationService.AFFILIATION_CLAIM] as Affiliation;
        // de nieuwe sessie staat al in de metadata, dus hoeven we alleen de isCurrentContextOuderVerzorger check te doen.
        const availableContexts = this._authenticationState.getAantalAccountProfielen();
        if (Affiliation.LEERLING === affiliation && availableContexts > 1) {
            info(`validateUserType: multiple context for leerling not allowed.`);
            return AuthenticationEventType.MULTI_LOGIN_NOT_ALLOWED;
        }
        return AuthenticationService.SUPPORTED_AFFILIATIONS.includes(affiliation)
            ? undefined
            : AuthenticationEventType.MEDEWERKER_UNSUPPORTED;
    }

    private _leerlingMetadata(claimset: Record<string, any>, organisatienaam?: string): SomtodayLeerling[] {
        const leerlingenClaim = claimset['leerlingen'];
        const leerlingen = !leerlingenClaim ? [] : JSON.parse(leerlingenClaim).ll;
        return leerlingen.map((leerling: SomtodayLeerling) => {
            return { ...leerling, schoolnaam: organisatienaam, initialen: leerling?.nn?.substring(0, 1)?.toUpperCase() };
        });
    }

    // Getters
    get events$(): Observable<AuthenticationEvent> {
        return this._authEvents$;
    }

    get currentAccountLeerling$(): Observable<SomtodayLeerlingIngelogdAccount> {
        return this._authenticationState.currentAccountLeerling$;
    }

    /**
     * Gets the current authentication contexts state of authentication.
     * Depending on the initialization state, this promise may take a few ms to resolve (will be called after auth-lib initialization if not initiliaizer).
     */
    get isLoggedIn(): Promise<boolean> {
        info('Is logged in?');
        if (this._errorOnContext.value) {
            info('Error - dus retry');
            this.retryDiscoveryDocument();
        }
        if (this._oauthService.discoveryDocumentLoaded || this._errorOnContext.value) {
            info('Is er een sessie?' + this._authenticationState.hasAnyAuthenticatedSession());

            return Promise.resolve(this._authenticationState.hasAnyAuthenticatedSession());
        }
        info('Default return _afterInitialLoading');

        return new Promise<boolean>((resolve) => {
            this._afterInitialLoading = resolve;
        });
    }

    /**
     *
     */
    get isCurrentContextLoggedIn$(): Observable<boolean> {
        return this._authenticationState.isCurrentContextLoggedIn$;
    }

    get isCurrentContextLoggedIn(): boolean {
        return this._authenticationState.isCurrentContextLoggedIn;
    }

    private async _preFetchPasfotos(subLeerlingen: SomtodayLeerling[]): Promise<void> {
        const pasfotoLeerlingen = await Promise.all(
            subLeerlingen.map((leerling) => firstValueFrom(this._requestService.get<RLeerling>(`leerlingen/${leerling.id}`)))
        );
        subLeerlingen.forEach((leerling) => {
            const pasfotoLeerling = pasfotoLeerlingen.find((pasfotoLeerling) => leerling.id === pasfotoLeerling.links?.[0].id);
            leerling.avatarSrc = pasfotoLeerling?.pasfotoUrl;
        });
    }

    private _currentProfileIsEmpty(): boolean {
        const currentProfiel = this._authenticationState.findAccountProfiel(this._authenticationState.getCurrentSessionIdentifier());
        if (!currentProfiel) return false;
        return !currentProfiel.isAuthenticated;
    }

    public retryDiscoveryDocument() {
        if (this._errorOnContext.value || !this._oauthService.discoveryDocumentLoaded) this._oauthService.loadDiscoveryDocumentAndLogin();
    }

    public get currentSessionIdentifier() {
        return this._authenticationState.getCurrentSessionIdentifier();
    }

    public get beschikbareProfielen$(): Observable<SomtodayAccountProfiel[]> {
        return this._authenticationState.beschikbareProfielen$;
    }

    public get currentProfiel$(): Observable<SomtodayAccountProfiel | undefined> {
        return this._authenticationState.currentProfiel$;
    }

    public get currentAffiliation$(): Observable<Affiliation | undefined> {
        return this._authenticationState.currentAffiliation$;
    }

    public get isCurrentContextLeerling(): boolean {
        return this._isCurrentContextAffiliation(Affiliation.LEERLING);
    }

    public get isCurrentContextOuderVerzorger(): boolean {
        return this._isCurrentContextAffiliation(Affiliation.PARENT_GUARDIAN);
    }

    private _isCurrentContextAffiliation(affiliation: Affiliation): boolean {
        const currentProfiel = this._authenticationState.findAccountProfiel(this._authenticationState.getCurrentSessionIdentifier());
        return currentProfiel?.affiliation === affiliation;
    }

    get authenticationState$(): Observable<Status> {
        return this._status$.asObservable();
    }

    get isAuthenticationReady$(): Observable<boolean> {
        return this.authenticationState$.pipe(map((state) => state === 'READY'));
    }

    public _clearCaches(): void {
        // letop, clear all but rechten en landelijke mededelingen
        for (const stateName of nxgsStorageKeys.map((sKey) => sKey.stateName)) {
            if (!['rechten', 'landelijkeMededelingen'].includes(stateName)) localStorage.removeItem(stateName);
        }
        // week notifications + rooster/huiswerk caches
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key.startsWith('weekNotificationDiscarded') || key.startsWith('rooster-refresh-') || key.startsWith('huiswerk-refresh-')) {
                localStorage.removeItem(key);
            }
        }
    }

    /**
     * Deze interceptor kan gebruikt te worden om de context switch te interrupteren, bijv. als er om een user confirmation
     * gevraagd moet worden.
     */
    public setContextSwitchRequestInterceptor(interceptor: ContextSwitchRequestInterceptor) {
        if (this._contextSwitchRequestInterceptor) {
            throw new Error(`Interceptor was already set, remove before registering again`);
        }
        this._contextSwitchRequestInterceptor = interceptor;
    }

    public removeContextSwitchRequestInterceptor() {
        if (!this._contextSwitchRequestInterceptor) {
            throw new Error(`No interceptor set, must be registered first`);
        }
        this._contextSwitchRequestInterceptor = undefined;
    }

    public requestAddContextAndLogin() {
        this.startContextSwitchRequest({ type: 'AddContextAndLogin' });
    }

    public requestSwitchToProfile(accountContext: SessionIdentifier, leerling: SomtodayLeerling) {
        this.startContextSwitchRequest({ type: 'SwitchToProfile', accountContext, leerling });
    }

    private startContextSwitchRequest(request: ContextSwitchRequest) {
        if (!this._contextSwitchRequestInterceptor) {
            return this.continueContextSwitchRequest(request);
        }
        const canContinue = this._contextSwitchRequestInterceptor(request);
        if (canContinue instanceof Observable) {
            canContinue
                .pipe(
                    filter((isTrue) => isTrue),
                    take(1)
                )
                .subscribe(() => this.continueContextSwitchRequest(request));
        } else if (canContinue === true) {
            this.continueContextSwitchRequest(request);
        }
    }

    private continueContextSwitchRequest(request: ContextSwitchRequest) {
        switch (request.type) {
            case 'AddContextAndLogin':
                this.addContextAndLogin();
                break;
            case 'SwitchToProfile':
                this.switchToProfile(request.accountContext, request.leerling);
                break;
        }
    }

    public async hasChangedContext(): Promise<boolean> {
        const storageProviderContextID = (await this._authenticationState.reloadSessionIdFromStorage())?.UUID;
        const authStateContextID = this._authenticationState.getCurrentSessionIdentifier()?.UUID;
        return storageProviderContextID !== authStateContextID;
    }
}

interface AddContextAndLoginRequest {
    type: 'AddContextAndLogin';
}

interface SwitchToProfileRequest {
    type: 'SwitchToProfile';
    accountContext: SessionIdentifier;
    leerling: SomtodayLeerling;
}

type ContextSwitchRequest = AddContextAndLoginRequest | SwitchToProfileRequest;

export type ContextSwitchRequestInterceptor = (request: ContextSwitchRequest) => boolean | Observable<boolean>;
