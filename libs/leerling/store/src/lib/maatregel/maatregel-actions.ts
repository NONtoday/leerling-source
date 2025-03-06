export class RefreshMaatregelen {
    static readonly type = '[Maatregelen] Refresh Maatregelen';

    constructor(readonly requestOptions: { forceRequest?: true } = {}) {}
}
