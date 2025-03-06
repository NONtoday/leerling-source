export class RefreshVakResultaat {
    static readonly type = '[VakResultaat] Refresh Vak Resultaat';

    constructor(
        public vakUuid: string,
        public lichtingUuid: string,
        public plaatsingUuid?: string,
        public metKolommen = false
    ) {}
}

export class GetVoortgangsdossierDeeltoetsen {
    static readonly type = '[VakResultaat] Get Deeltoetsen Voortgangsdossier';

    constructor(
        public plaatsingUuid: string | undefined,
        public samengesteldeToetsId: number,
        public metKolommen = false
    ) {}
}

export class GetExamendossierDeeltoetsen {
    static readonly type = '[VakResultaat] Get Deeltoetsen Examendossier';

    constructor(
        public plaatsingUuid: string | undefined,
        public samengesteldeToetsId: number,
        public metKolommen = false
    ) {}
}
