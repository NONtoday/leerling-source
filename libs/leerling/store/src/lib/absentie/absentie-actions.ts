import { SAbsentieMeldingInvoer } from './absentie-model';

export class RefreshAbsentieRedenen {
    static readonly type = '[Absentie] Refresh Absentie Redenen';
    constructor(public vestigingId: number) {}
}

export class VerstuurAbsentieMelding {
    static readonly type = '[Absentie] Verstuur Absentie Melding';

    constructor(public absentieMeldingInvoer: SAbsentieMeldingInvoer) {}
}
