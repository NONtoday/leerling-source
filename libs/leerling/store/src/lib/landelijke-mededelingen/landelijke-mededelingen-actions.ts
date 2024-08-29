export class RefreshLandelijkeMededelingen {
    static readonly type = '[Landelijke Mededelingen] Refresh Landelijke Mededelingen';
}

export class LandelijkeMededelingGelezen {
    static readonly type = '[Landelijke Mededelingen] Landelijke Mededeling gelezen';

    constructor(public id: number) {}
}
