import { SGeldendResultaat, SGeldendVoortgangsdossierResultaat, SToetskolom } from '../geldendresultaat-model';

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

export interface SToetskolommen {
    vakUuid: string;
    lichtingUuid: string;
    plaatsingUuid?: string;
    resultaatKolommen: SToetskolom[];
}

export interface SVakVoortgangsResultaatMap {
    [vak_lichting_plaatsing: string]: SVakVoortgangsResultaat;
}
export interface SVakExamenResultaatMap {
    [vak_lichting_plaatsing: string]: SVakExamenResultaat;
}

export interface SToetskolomMap {
    [vak_lichting_plaatsing: string]: SToetskolommen;
}

export interface SVoortgangsdossierDeeltoetsenMap {
    [samengestelde_toets: number]: SGeldendVoortgangsdossierResultaat[];
}
export interface SExamendossierDeeltoetsenMap {
    [samengestelde_toets: number]: SGeldendResultaat[];
}

export interface SDeeltoetsKolommenMap {
    [samengestelde_toets: number]: SToetskolom[];
}

export interface SVakResultaatModel {
    // concat van de keys
    geldendVoortgangsResultaten: SVakVoortgangsResultaatMap | undefined;
    geldendExamenResultaten: SVakExamenResultaatMap | undefined;
    voortgangsdossierDeeltoetsen: SVoortgangsdossierDeeltoetsenMap | undefined;
    examendossierDeeltoetsen: SExamendossierDeeltoetsenMap | undefined;
    voortgangsKolommen: SToetskolomMap | undefined;
    examenKolommen: SToetskolomMap | undefined;
    voortgangsdossierDeeltoetsKolommen: SDeeltoetsKolommenMap | undefined;
    examendossierDeeltoetsKolommen: SDeeltoetsKolommenMap | undefined;
}

export function createVakResultaatKey(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string): string {
    return vakUuid + '_' + lichtingUuid + '_' + plaatsingUuid;
}

export function emptyGeldendResultaat(kolom: SToetskolom) {
    return {
        id: kolom.id,
        dossierType: kolom.dossierType,
        periode: kolom.periode,
        periodeAfkorting: kolom.periodeAfkorting,
        volgnummer: kolom.volgnummer,
        type: kolom.type,
        toetscode: kolom.toetscode,
        omschrijving: kolom.omschrijving,
        weging: kolom.weging,
        vakNaam: '',
        resultaatkolom: kolom.id,
        herkansingssoort: kolom.herkansingssoort,
        isLabel: kolom.isLabel,
        isCijfer: !kolom.isLabel,
        toetssoort: kolom.toetsSoort,
        vakUuid: kolom.vakUuid,
        lichtingUuid: kolom.lichtingUuid,
        leerjaar: kolom.leerjaar
        //anderVakKolom?: SResultaatAnderVakKolom;
    } as SGeldendResultaat;
}
