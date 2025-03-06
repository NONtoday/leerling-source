export class InitializeRechten {
    static readonly type = '[Rechten] Initialize rechten';
    constructor(public accountContextID: string) {}
}

export class RefreshRechten {
    static readonly type = '[Rechten] Refresh rechten';
    constructor(public forceUpdate = false) {}
}

export class RemoveRechten {
    static readonly type = '[Rechten] Remove rechten';
    constructor(public localContextUUID: string) {}
}

export class SanitizeRechten {
    static readonly type = '[Rechten] Sanitize rechten';
    constructor(public knownSessions: string[]) {}
}
