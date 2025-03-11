export class SwitchContext {
    static readonly type = '[Shared] Switch Context';

    constructor(
        public localAuthenticationContext: string,
        public accountUUID?: string,
        public leerlingId?: number
    ) {}
}

export class UpdateConnectionStatus {
    static readonly type = '[Shared] Update Connection Status';

    constructor(
        public isOnline: boolean,
        public limitedData: boolean
    ) {}
}
