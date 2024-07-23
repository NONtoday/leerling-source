import { SRegistratiePeriode } from 'leerling-registraties-models';

export class SelectTijdspan {
    static readonly type = '[Registraties] Select tijdspan';
    constructor(public tijdspan: SRegistratiePeriode) {}
}

export class RefreshRegistraties {
    static readonly type = '[Registraties] Refresh registraties';
}
