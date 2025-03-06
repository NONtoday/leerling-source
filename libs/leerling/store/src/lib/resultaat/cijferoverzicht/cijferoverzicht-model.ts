import { isPresent } from 'harmony';
import {
    RCijferPeriode,
    RLeerlingVakExamenResultaten,
    RLeerlingVakVoortgangResultaten,
    RLeerlingVakVoortgangResultatenPeriode,
    RLeerlingVoortgangResultaten
} from 'leerling-codegen';
import { DEFAULT_STRING, getAdditionalString } from '../../util/entiteit-model';
import { mapVakkeuze, SVakkeuze } from '../../vakkeuze/vakkeuze-model';
import {
    createExamenToetskolommen,
    mapGeldendResultaat,
    mapGeldendVoortgangsdossierResultaat,
    SGeldendResultaat,
    SGeldendVoortgangsdossierResultaat,
    SToetskolom
} from '../geldendresultaat-model';

export const ADDITIONAL_TOETSSOORTAFKORTING = 'toetssoortafkorting';
export interface SCijferOverzichtModel {
    voortgangOverzichten: SVoortgangCijferOverzicht[];
    examenOverzichten: SExamenCijferOverzicht[];
}

export interface SCijferPeriode {
    periode: number;
    begin?: Date;
    eind?: Date;
    afkorting?: string;
}

export interface SExamenCijferOverzicht {
    plaatsingUuid: string;
    examenVakResultaten: SExamenVakExamenResultaten[];
    lichtingUuid: string | undefined;
}

export interface SVoortgangCijferOverzicht {
    plaatsingUuid: string;
    vakResultaten: SVakResultaten[];
    cijferperioden: SCijferPeriode[];
}

export interface SVakResultaten {
    vakkeuze: SVakkeuze;
    perioden: SVakPeriode[];
    meervoudigeToetsnormering: boolean;
    standaardNormering?: string;
    alternatieveNormering?: string;
    anderNiveau?: string;
}

export interface SVakPeriode {
    periode: number;
    resultaten: SGeldendVoortgangsdossierResultaat[];
    periodeGemiddelde?: SGeldendVoortgangsdossierResultaat;
    rapportGemiddelde?: SGeldendVoortgangsdossierResultaat;
    rapportCijfer?: SGeldendVoortgangsdossierResultaat;
}

export interface SToetssoortGemiddeldeResultaat extends SGeldendResultaat {
    toetssoortafkorting: string;
}

export interface SExamenVakExamenResultaten {
    resultaten: SGeldendResultaat[];
    seResultaat?: SGeldendResultaat;
    toetssoortGemiddelden: SToetssoortGemiddeldeResultaat[];
    vakkeuze: SVakkeuze;
    afwijkendeOnderwijssoort?: string;
    afwijkendEindjaar?: number;
}

function createLeegResultaat(toetskolom: SToetskolom): SGeldendResultaat {
    return {
        dossierType: toetskolom.dossierType,
        herkansingssoort: toetskolom.herkansingssoort,
        id: toetskolom.id,
        isCijfer: !toetskolom.isLabel,
        isLabel: toetskolom.isLabel,
        leerjaar: toetskolom.leerjaar,
        lichtingUuid: toetskolom.lichtingUuid,
        omschrijving: toetskolom.omschrijving,
        resultaatkolom: toetskolom.id,
        toetssoort: toetskolom.toetsSoort,
        toetscode: toetskolom.toetscode,
        weging: toetskolom.weging,
        type: toetskolom.type,
        vakNaam: DEFAULT_STRING,
        vakUuid: toetskolom.vakUuid
    };
}

export function mapExamenVakExamenResultaten(rExamenResultaten: RLeerlingVakExamenResultaten): SExamenVakExamenResultaten | undefined {
    const vakkeuze = rExamenResultaten.vakkeuze ? mapVakkeuze(rExamenResultaten.vakkeuze) : undefined;
    if (!vakkeuze) return undefined;

    const resultaten: SGeldendResultaat[] =
        rExamenResultaten.resultaten?.map((resultaat) => mapGeldendResultaat('Examen', resultaat)) ?? [];

    const overigeToetsenMetLegeResultaten: SGeldendResultaat[] = createExamenToetskolommen(rExamenResultaten.overigeToetskolommen).map(
        (toetsKolom) => createLeegResultaat(toetsKolom)
    );

    return {
        resultaten: resultaten.concat(overigeToetsenMetLegeResultaten),
        seResultaat: rExamenResultaten.seResultaat ? mapGeldendResultaat('Examen', rExamenResultaten.seResultaat) : undefined,
        toetssoortGemiddelden:
            rExamenResultaten.toetssoortGemiddelden?.map((toetssoortgemiddelde) => {
                return {
                    ...mapGeldendResultaat('Examen', toetssoortgemiddelde),
                    toetssoortafkorting: getAdditionalString(toetssoortgemiddelde, ADDITIONAL_TOETSSOORTAFKORTING) ?? ''
                };
            }) ?? [],
        vakkeuze: vakkeuze,
        afwijkendeOnderwijssoort: rExamenResultaten.afwijkendeOnderwijssoort,
        afwijkendEindjaar: rExamenResultaten.afwijkendEindjaar
    };
}

export function mapVoortgangCijferoverzicht(plaatinsgUuid: string, voortgang: RLeerlingVoortgangResultaten): SVoortgangCijferOverzicht {
    return {
        plaatsingUuid: plaatinsgUuid,
        vakResultaten: voortgang.vakResultaten?.map((entry) => mapVakVoortgangsResultaten(entry)).filter(isPresent) ?? [],
        cijferperioden: voortgang.cijferperioden?.map((periode) => mapCijferPeriode(periode)).filter(isPresent) ?? []
    };
}

export function mapVakVoortgangsResultaten(entry: RLeerlingVakVoortgangResultaten): SVakResultaten | undefined {
    const vakkeuze = entry.vakkeuze && mapVakkeuze(entry.vakkeuze);
    if (!vakkeuze) return;

    return {
        vakkeuze: vakkeuze,
        perioden: entry.perioden?.map((periode) => mapPeriode(periode)).filter(isPresent) ?? [],
        meervoudigeToetsnormering: entry.meervoudigeToetsnormering ?? false,
        standaardNormering: entry.standaardNormering,
        alternatieveNormering: entry.alternatieveNormering,
        anderNiveau: entry.anderNiveau
    };
}

export function mapPeriode(periode: RLeerlingVakVoortgangResultatenPeriode): SVakPeriode | undefined {
    if (!periode.periode) return undefined;

    return {
        periode: periode.periode,
        resultaten: periode.resultaten?.map((resultaat) => mapGeldendVoortgangsdossierResultaat(resultaat)) ?? [],
        periodeGemiddelde: periode.periodeGemiddelde ? mapGeldendVoortgangsdossierResultaat(periode.periodeGemiddelde) : undefined,
        rapportGemiddelde: periode.rapportGemiddelde ? mapGeldendVoortgangsdossierResultaat(periode.rapportGemiddelde) : undefined,
        rapportCijfer: periode.rapportCijfer ? mapGeldendVoortgangsdossierResultaat(periode.rapportCijfer) : undefined
    };
}

export function mapCijferPeriode(periode: RCijferPeriode): SCijferPeriode {
    return {
        periode: periode.periode ?? 0,
        begin: periode.datumVan ? new Date(periode.datumVan) : undefined,
        eind: periode.datumTot ? new Date(periode.datumTot) : undefined,
        afkorting: periode.afkorting
    };
}
