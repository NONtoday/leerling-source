import { SGeldendResultaat, SGeldendVoortgangsdossierResultaat } from '../geldendresultaat-model';

export interface SVakVoortgangsResultaat {
    vakUuid: string;
    lichtingUuid: string;
    plaatsingUuid?: string;
    geldendVoortgangsResultaten: SGeldendVoortgangsdossierResultaat[];
}

export interface SVakExamenResultaat {
    vakUuid: string;
    lichtingUuid: string;
    plaatsingUuid?: string;
    geldendExamenResultaten: SGeldendResultaat[];
}

export interface SVakVoortgangsResultaatMap {
    [vak_lichting_plaatsing: string]: SVakVoortgangsResultaat;
}
export interface SVakExamenResultaatMap {
    [vak_lichting_plaatsing: string]: SVakExamenResultaat;
}

export interface SVoortgangsdossierDeeltoetsenMap {
    [samengestelde_toets: number]: SGeldendVoortgangsdossierResultaat[];
}
export interface SExamendossierDeeltoetsenMap {
    [samengestelde_toets: number]: SGeldendResultaat[];
}

export interface SVakResultaatModel {
    // concat van de keys
    geldendVoortgangsResultaten: SVakVoortgangsResultaatMap | undefined;
    geldendExamenResultaten: SVakExamenResultaatMap | undefined;
    voortgangsdossierDeeltoetsen: SVoortgangsdossierDeeltoetsenMap | undefined;
    examendossierDeeltoetsen: SExamendossierDeeltoetsenMap | undefined;
}

export function createVakResultaatKey(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string): string {
    return vakUuid + '_' + lichtingUuid + '_' + plaatsingUuid;
}
