import { SRegistratiePeriode } from 'leerling-registraties-models';

export class SelectTijdspan {
    static readonly type = '[Registraties] Select tijdspan';
    constructor(public tijdspan: SRegistratiePeriode) {}
}

export class RefreshRegistraties {
    static readonly type = '[Registraties] Refresh registraties';

    constructor(readonly requestOptions: { forceRequest?: boolean } = {}) {}
}

export class SetIsLoading {
    static readonly type = '[Registraties] Set is loading';
    constructor(public isLoading: boolean) {}
}
