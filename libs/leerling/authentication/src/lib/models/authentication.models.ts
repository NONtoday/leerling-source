export enum AuthenticationEventType {
    INITIALIZED,
    LEERLING_SWITCHED,
    ACCOUNT_REMOVED,
    DEDUPLICATED,
    IDP_ERROR,
    MULTI_LOGIN_NOT_ALLOWED,
    CURRENT_STATE_AUTHENTICATED,
    FAILED_TO_INITIALIZE,
    ACCOUNT_SWITCHED,
    CONTEXT_NOT_FOUND,
    MEDEWERKER_UNSUPPORTED,
    TOKEN_RECEIVED
}

export enum Affiliation {
    LEERLING = 'student',
    PARENT_GUARDIAN = 'parent/guardian'
}

export class AuthenticationEvent {
    constructor(public type: AuthenticationEventType) {}
}

export class AuthenticationAccountRemovedEvent extends AuthenticationEvent {
    constructor(public previousSessionIdentifier?: SessionIdentifier) {
        super(AuthenticationEventType.ACCOUNT_REMOVED);
    }
}

export class AuthenticationContextNotFoundEvent extends AuthenticationEvent {
    constructor() {
        super(AuthenticationEventType.CONTEXT_NOT_FOUND);
    }
}

export class AuthenticatedSuccessEvent extends AuthenticationEvent {
    constructor() {
        super(AuthenticationEventType.CURRENT_STATE_AUTHENTICATED);
    }
}

export class OAuthIDPErrorEvent extends AuthenticationEvent {
    private _humanReadableErrorMessage: string;
    constructor(err: string) {
        super(AuthenticationEventType.IDP_ERROR);
        this._humanReadableErrorMessage = err;
    }
    get humanReadableErrorMessage() {
        return this._humanReadableErrorMessage;
    }
}

export class AffiliationDoesNotAllowMultipleContexts extends AuthenticationEvent {
    constructor(public hasOtherContextAvailable?: boolean) {
        super(AuthenticationEventType.MULTI_LOGIN_NOT_ALLOWED);
    }
}

export class MedewerkerNotAllowedEvent extends AuthenticationEvent {
    constructor(public hasOtherContextAvailable?: boolean) {
        super(AuthenticationEventType.MEDEWERKER_UNSUPPORTED);
    }
}

export class FailedToInitializeSomtodayIDP extends AuthenticationEvent {
    constructor() {
        super(AuthenticationEventType.FAILED_TO_INITIALIZE);
    }
}

export class OAuthBeforeSwitchContextEvent extends AuthenticationEvent {
    readonly _newContextUUID: string;
    readonly _didRequireInitialisation: boolean;

    constructor(newContext: string, didRequireInitialisation: boolean) {
        super(AuthenticationEventType.LEERLING_SWITCHED);
        this._newContextUUID = newContext;
        this._didRequireInitialisation = didRequireInitialisation;
    }

    get newContextUUID() {
        return this._newContextUUID;
    }

    get didRequireInitialisation() {
        return this._didRequireInitialisation;
    }
}

export class OAuthRemovedDuplicateContextEvent extends AuthenticationEvent {
    constructor() {
        super(AuthenticationEventType.DEDUPLICATED);
    }
}

export class AccountSwitchedEvents extends AuthenticationEvent {
    constructor() {
        super(AuthenticationEventType.ACCOUNT_SWITCHED);
    }
}

export class TokenReceivedEvent extends AuthenticationEvent {
    constructor() {
        super(AuthenticationEventType.TOKEN_RECEIVED);
    }
}

/**
 * Zodra we ergens een (gegenereerd) model aanbieden, deze verplaatsen.
 */
export interface AuthenticationMetadata {
    currentSessionIdentifier?: SessionIdentifier;
    currentLeerling?: SomtodayLeerling;
    allAuthenticationRecords: SomtodayAccountProfiel[];
}

export interface SomtodayLeerlingIngelogdAccount {
    leerling?: SomtodayLeerling;
    accountUUID?: string;
    sessionIdentifier?: SessionIdentifier;
}

export interface SomtodayLeerling {
    id: number; // nodig voor rest request
    gn: string; //voornaam
    nn: string; //roepnaam
    nr: string; //llnr
    schoolnaam?: string; // optional computed property
    initialen?: string; // optional computed property
    avatarSrc?: string;
}

export interface SomtodayAccountProfiel {
    sessionIdentifier: SessionIdentifier;
    isAuthenticated: boolean;
    affiliation?: Affiliation;
    accountUUID?: string;
    organisatieUUID?: string; // let op, komen concat binnen in id_token subject claim
    identiteitUUID?: string; // optional: niet altijd beschikbaar in claimset
    voornaam?: string;
    schoolnaam?: string;
    subLeerlingen: SomtodayLeerling[]; // if ouder/verzorgder: kinderen in subAccounts
}

export interface SessionIdentifier {
    UUID: string;
}
