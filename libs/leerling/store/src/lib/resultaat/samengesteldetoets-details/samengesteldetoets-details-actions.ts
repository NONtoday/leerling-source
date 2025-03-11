export class GetVoortgangsdossierSamengesteldeToetsDetails {
    static readonly type = '[LaatsteResultaat] Get Samengestelde toets details Voortgangsdossier';

    constructor(public deeltoetsId: number) {}
}

export class GetExamendossierSamengesteldeToetsDetails {
    static readonly type = '[LaatsteResultaat] Get Samengestelde toets details Examendossier';

    constructor(public deeltoetsId: number) {}
}
