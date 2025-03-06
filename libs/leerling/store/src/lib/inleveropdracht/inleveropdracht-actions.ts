export class RefreshInleverDetails {
    static readonly type = '[Inleveropdracht] Refresh Inleverdetails';

    constructor(
        public toekenningId: number,
        public toekenningDatum: Date
    ) {}
}

export class VerstuurReactie {
    static readonly type = '[Inleveropdracht] Verstuur reactie';

    constructor(
        public toekenningId: number,
        public toekenningDatum: Date,
        public inhoud: string
    ) {}
}

export class VerwijderInlevering {
    static readonly type = '[Inleveropdracht] Verwijder inlevering';

    constructor(
        public toekenningId: number,
        public inleveringId: number,
        public toekenningDatum: Date
    ) {}
}

export class AccepteerEula {
    static readonly type = '[Inleveropdracht] accepteer EULA';
}
