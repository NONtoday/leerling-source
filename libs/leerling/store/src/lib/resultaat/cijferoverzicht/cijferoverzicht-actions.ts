export class RefreshVoortgangCijferoverzicht {
    static readonly type = '[Cijferoverzicht] Refresh Voortgang Cijferoverzicht';

    constructor(public plaatsingUuid: string) {}
}

export class RefreshExamenCijferoverzicht {
    static readonly type = '[Cijferoverzicht] Refresh Examen Cijferoverzicht';

    constructor(
        public plaatsingUuid: string,
        public lichtingUuid: string | undefined
    ) {}
}
