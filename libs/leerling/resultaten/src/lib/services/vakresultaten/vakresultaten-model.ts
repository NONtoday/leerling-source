import { isPresent } from 'harmony';
import {
    SGeldendResultaat,
    SGeldendVoortgangsdossierResultaat,
    SVakExamenResultaat,
    SVakVoortgangsResultaat,
    Toetstype,
    createDummyResultaat,
    isGeimporteerdSeResultaat
} from 'leerling/store';
import { upperFirst } from 'lodash-es';
import { IsVoldoendeType, formatIsVoldoende } from '../../components/resultaat-item/resultaat-item-model';
import { Poging, formatCijferDate } from '../laatsteresultaten/laatsteresultaten-model';

export interface PogingData {
    omschrijving: string;
    datum: string;
    resultaat: string;
    isOnvoldoende: boolean;
    opmerking?: string;
}

export interface ToetsResultaat<T extends SGeldendResultaat> {
    naam: string;
    datum: string;
    resultaat: string;
    wegingVoortgang?: string;
    wegingExamen?: string;

    isSamengesteld: boolean;
    heeftHerkansing: boolean;
    heeftOpmerking: boolean;
    isVoldoende: IsVoldoendeType;
    laatstePoging: Poging;
    geldendResultaat: T;
    pogingen: PogingData[];
}

export interface VoortgangsPeriode {
    periode: number;
    afkorting: string | undefined | null;
    periodeGemiddelde?: string;
    periodeGemiddeldeIsOnvoldoende?: boolean;
    rapportGemiddelde?: string;
    rapportGemiddeldeIsOnvoldoende?: boolean;
    rapportCijfer?: string;
    rapportCijferOpmerking?: string;
    rapportCijferIsOnvoldoende?: boolean;
    toetsResultaten: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[];
}

export interface VoortgangsNiveau {
    naam: string;
    perioden: VoortgangsPeriode[];
    heeftResultaten: boolean;
}

export interface VakVoortgangsdossier {
    vaknaam: string;
    lichtingUuid: string;
    plaatsingUuid?: string;
    standaardNiveau: VoortgangsNiveau;
    alternatiefNiveau?: VoortgangsNiveau;
}

export interface ToetssoortGemiddelde {
    naam: string;
    resultaat: string;
    isOnvoldoende: boolean;
    geldendResultaat: SGeldendResultaat;
}

export interface VakExamendossier {
    vaknaam: string;
    seCijfer: string;
    isOnvoldoende: boolean;
    toetssoortGemiddelden: ToetssoortGemiddelde[];
    resultaten: ToetsResultaat<SGeldendResultaat>[];
    heeftResultaten: boolean;
}

export interface VakToetsdossier {
    voortgangsdossier: VakVoortgangsdossier | undefined;
    examendossier: VakExamendossier | undefined;
    vakNaam: string | undefined;
}

export function mapToVakVoortgangsdossier(vakVoortgangsResultaat: SVakVoortgangsResultaat): VakVoortgangsdossier | undefined {
    if (!vakVoortgangsResultaat) {
        return undefined;
    }

    const voortgangsResultaten = vakVoortgangsResultaat.geldendVoortgangsResultaten;
    if (voortgangsResultaten.length === 0) {
        return {
            vaknaam: '',
            lichtingUuid: '',
            standaardNiveau: { naam: '', perioden: [], heeftResultaten: false }
        };
    }

    return {
        vaknaam: upperFirst(voortgangsResultaten[0].vakNaam),
        lichtingUuid: vakVoortgangsResultaat.lichtingUuid,
        plaatsingUuid: vakVoortgangsResultaat.plaatsingUuid,
        standaardNiveau: getStandaardNiveau(voortgangsResultaten),
        alternatiefNiveau: getAlternatiefNiveau(voortgangsResultaten)
    };
}

const TOETS_TOETSTYPEN: Toetstype[] = ['Toetskolom', 'SamengesteldeToetsKolom', 'Werkstukcijferkolom', 'Advieskolom', 'RapportToetskolom'];

function getStandaardNiveau(voortgangsResultaten: SGeldendVoortgangsdossierResultaat[]): VoortgangsNiveau {
    const toetsResultaten = getResultaten(voortgangsResultaten, TOETS_TOETSTYPEN);
    const periodeGemiddelden = getResultaten(voortgangsResultaten, ['PeriodeGemiddeldeKolom']);
    const rapportGemiddelden = getResultaten(voortgangsResultaten, ['RapportGemiddeldeKolom']);
    const rapportCijfers = getResultaten(voortgangsResultaten, ['RapportCijferKolom']);
    const perioden = getPerioden(toetsResultaten, periodeGemiddelden, rapportGemiddelden, rapportCijfers);

    return {
        naam: upperFirst(toetsResultaten[0]?.geldendResultaat.naamStandaardNiveau) ?? 'Standaard',
        perioden: perioden,
        heeftResultaten:
            toetsResultaten.length > 0 || periodeGemiddelden.length > 0 || rapportGemiddelden.length > 0 || rapportCijfers.length > 0
    };
}

function getAlternatiefNiveau(voortgangsResultaten: SGeldendVoortgangsdossierResultaat[]): VoortgangsNiveau | undefined {
    const toetsResultaten = getAlternatieveResultaten(voortgangsResultaten, TOETS_TOETSTYPEN);
    const periodeGemiddelden = getAlternatieveResultaten(voortgangsResultaten, ['PeriodeGemiddeldeKolom']);
    const rapportGemiddelden = getAlternatieveResultaten(voortgangsResultaten, ['RapportGemiddeldeKolom']);
    const rapportCijfers = getAlternatieveResultaten(voortgangsResultaten, ['RapportCijferKolom']);
    const perioden = getPerioden(toetsResultaten, periodeGemiddelden, rapportGemiddelden, rapportCijfers);
    const periodeNummers = Object.keys(perioden) as object as number[];
    if (periodeNummers.length === 0) {
        return undefined;
    }

    return {
        naam: upperFirst(perioden[periodeNummers[0]].toetsResultaten[0]?.geldendResultaat.naamAlternatiefNiveau) ?? 'Alternatief',
        perioden: perioden,
        heeftResultaten:
            toetsResultaten.length > 0 || periodeGemiddelden.length > 0 || rapportGemiddelden.length > 0 || rapportCijfers.length > 0
    };
}

function getPerioden(
    resultaten: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[],
    periodeGemiddelden: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[],
    rapportGemiddelden: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[],
    rapportCijfers: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[]
): VoortgangsPeriode[] {
    const perioden: { [periode: number]: VoortgangsPeriode } = {};
    vulPerioden(perioden, resultaten, (voortgangsPeriode, resultaat) => {
        voortgangsPeriode.toetsResultaten.push(resultaat);
    });
    vulPerioden(perioden, periodeGemiddelden, (voortgangsPeriode, resultaat) => {
        voortgangsPeriode.periodeGemiddelde = resultaat.resultaat;
        voortgangsPeriode.periodeGemiddeldeIsOnvoldoende = resultaat.isVoldoende === 'onvoldoende';
    });
    vulPerioden(perioden, rapportGemiddelden, (voortgangsPeriode, resultaat) => {
        voortgangsPeriode.rapportGemiddelde = resultaat.resultaat;
        voortgangsPeriode.rapportGemiddeldeIsOnvoldoende = resultaat.isVoldoende === 'onvoldoende';
    });
    vulPerioden(perioden, rapportCijfers, (voortgangsPeriode, resultaat) => {
        voortgangsPeriode.rapportCijfer = resultaat.resultaat;
        voortgangsPeriode.rapportCijferIsOnvoldoende = resultaat.isVoldoende === 'onvoldoende';
        voortgangsPeriode.rapportCijferOpmerking = resultaat.geldendResultaat.opmerkingen;
    });

    verwijderLegePerioden(perioden);

    return Object.values(perioden);
}

/**
 * Een periode zonder cijfers, of met alleen RapportToetskolommen, hebben geen concrete cijfers en verwijderen we.
 * @param perioden
 */
function verwijderLegePerioden(perioden: { [periode: number]: VoortgangsPeriode }) {
    const periodeNummers = Object.keys(perioden) as object as number[];
    periodeNummers.forEach((periodeNummer) => {
        const periode = perioden[periodeNummer];
        if (!periode.toetsResultaten.find((toetsResultaat) => toetsResultaat.geldendResultaat.type !== 'RapportToetskolom')) {
            delete perioden[periodeNummer];
        }
    });
}

function vulPerioden(
    perioden: { [periode: number]: VoortgangsPeriode },
    resultaten: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[],
    vulPeriode: (voortgangsPeriode: VoortgangsPeriode, resultaat: ToetsResultaat<SGeldendVoortgangsdossierResultaat>) => void
) {
    resultaten.forEach((resultaat) => {
        const periodeNummer = resultaat.geldendResultaat.periode ?? 0;

        let voortgangsPeriode = perioden[periodeNummer];
        if (voortgangsPeriode === undefined) {
            voortgangsPeriode = {
                periode: periodeNummer,
                afkorting: resultaat.geldendResultaat.periodeAfkorting,
                toetsResultaten: []
            };
            perioden[periodeNummer] = voortgangsPeriode;
        }

        vulPeriode(voortgangsPeriode, resultaat);
    });
}

export function mapToVakExamendossier(vakExamenResultaat: SVakExamenResultaat): VakExamendossier | undefined {
    if (!vakExamenResultaat) {
        return undefined;
    }

    const examenResultaten = vakExamenResultaat.geldendExamenResultaten;
    if (examenResultaten.length === 0) {
        return { vaknaam: '', seCijfer: '', isOnvoldoende: false, toetssoortGemiddelden: [], resultaten: [], heeftResultaten: false };
    }

    const seCijfer = getResultaatVanType(examenResultaten, 'SEGemiddeldeKolom');
    let seResultaat: string;
    let seIsOnvoldoende: boolean;
    if (seCijfer === undefined || seCijfer.formattedResultaat === undefined) {
        seResultaat = '-';
        seIsOnvoldoende = false;
    } else {
        seResultaat = seCijfer.formattedResultaat;
        seIsOnvoldoende = seCijfer.isVoldoende === false;
    }

    const toetssoortGemiddelden = [...getToetsoortGemiddelden(examenResultaten), ...getGeimporteerdeSECijfers(examenResultaten)];
    const resultaten = getResultaten(examenResultaten, ['Toetskolom', 'SamengesteldeToetsKolom', 'Werkstukcijferkolom']);
    return {
        vaknaam: upperFirst(examenResultaten[0].vakNaam),
        seCijfer: seResultaat,
        isOnvoldoende: seIsOnvoldoende,
        toetssoortGemiddelden: toetssoortGemiddelden,
        resultaten: resultaten,
        heeftResultaten: toetssoortGemiddelden?.length > 0 || resultaten?.length > 0 || !!seResultaat
    };
}

function getToetsoortGemiddelden(resultaten: SGeldendResultaat[]): ToetssoortGemiddelde[] {
    return getResultatenVanType(resultaten, ['ToetssoortGemiddeldeKolom'])
        .map((resultaat) => {
            if (!resultaat.formattedResultaat) {
                return undefined;
            }

            return {
                naam: resultaat.toetssoort,
                resultaat: resultaat.formattedResultaat,
                isOnvoldoende: resultaat.isVoldoende === false,
                geldendResultaat: resultaat
            };
        })
        .filter(isPresent);
}

function getGeimporteerdeSECijfers(resultaten: SGeldendResultaat[]): ToetssoortGemiddelde[] {
    return resultaten
        .filter(isGeimporteerdSeResultaat)
        .map((resultaat) => {
            if (!resultaat.formattedResultaat) {
                return undefined;
            }
            return {
                naam: `Examencijfer ${resultaat.anderVakKolom?.vak.naam.toLowerCase()}`,
                resultaat: resultaat.formattedResultaat,
                isOnvoldoende: resultaat.isVoldoende === false,
                geldendResultaat: resultaat
            };
        })
        .filter(isPresent);
}

function getResultaten<T extends SGeldendResultaat>(resultaten: T[], toetstypen: Toetstype[]): ToetsResultaat<T>[] {
    return getResultatenVanType(resultaten, toetstypen)
        .filter((resultaat) => !isGeimporteerdSeResultaat(resultaat))
        .map((resultaat) => {
            if (!resultaat.formattedResultaat) {
                return undefined;
            }

            const pogingen: PogingData[] = [
                getPogingData(
                    2,
                    resultaat.formattedHerkansing2,
                    resultaat.isVoldoendeHerkansing2,
                    resultaat.datumInvoerHerkansing2,
                    resultaat.opmerkingenHerkansing2
                ),
                getPogingData(
                    1,
                    resultaat.formattedHerkansing1,
                    resultaat.isVoldoendeHerkansing1,
                    resultaat.datumInvoerHerkansing1,
                    resultaat.opmerkingenHerkansing1
                ),
                getPogingData(
                    0,
                    resultaat.formattedEerstePoging,
                    resultaat.isVoldoendeEerstePoging,
                    resultaat.datumInvoerEerstePoging,
                    resultaat.opmerkingenEerstePoging
                )
            ].filter(isPresent);

            return {
                naam: upperFirst(resultaat.omschrijving),
                datum: formatCijferDate(
                    resultaat.datumInvoerHerkansing2 ?? resultaat.datumInvoerHerkansing1 ?? resultaat.datumInvoerEerstePoging
                ),
                resultaat: resultaat.formattedResultaat,
                wegingVoortgang: resultaat.dossierType === 'Voortgang' ? resultaat.weging + 'x' : undefined,
                wegingExamen: resultaat.dossierType === 'Examen' ? resultaat.weging + 'x' : undefined,
                isSamengesteld: resultaat.type === 'SamengesteldeToetsKolom',
                heeftHerkansing: !!resultaat.formattedHerkansing1 || !!resultaat.formattedHerkansing2,
                heeftOpmerking: !!resultaat.opmerkingen,
                isVoldoende: bepaalIsVoldoende(resultaat.type, resultaat.weging, resultaat.isVoldoende),
                laatstePoging: getLaatstePoging(resultaat.formattedHerkansing1, resultaat.formattedHerkansing2),
                geldendResultaat: resultaat,
                pogingen: pogingen
            };
        })
        .filter(isPresent);
}

function getAlternatieveResultaten(
    resultaten: SGeldendVoortgangsdossierResultaat[],
    toetstypen: Toetstype[]
): ToetsResultaat<SGeldendVoortgangsdossierResultaat>[] {
    return getResultatenVanType(resultaten, toetstypen)
        .map((resultaat) => {
            if (!resultaat.formattedResultaatAlternatief) {
                return undefined;
            }

            const pogingen: PogingData[] = [
                getPogingData(
                    2,
                    resultaat.formattedHerkansing2Alternatief,
                    resultaat.isVoldoendeAlternatiefHerkansing2,
                    resultaat.datumInvoerHerkansing2,
                    resultaat.opmerkingenHerkansing2
                ),
                getPogingData(
                    1,
                    resultaat.formattedHerkansing1Alternatief,
                    resultaat.isVoldoendeAlternatiefHerkansing1,
                    resultaat.datumInvoerHerkansing1,
                    resultaat.opmerkingenHerkansing1
                ),
                getPogingData(
                    0,
                    resultaat.formattedEerstePogingAlternatief,
                    resultaat.isVoldoendeAlternatiefEerstePoging,
                    resultaat.datumInvoerEerstePoging,
                    resultaat.opmerkingenEerstePoging
                )
            ].filter(isPresent);

            return {
                naam: upperFirst(resultaat.omschrijving),
                datum: formatCijferDate(getGeldendeInvoerDatum(resultaat)),
                resultaat: resultaat.formattedResultaatAlternatief,
                wegingVoortgang: resultaat.dossierType === 'Voortgang' ? resultaat.weging + 'x' : undefined,
                wegingExamen: resultaat.dossierType === 'Examen' ? resultaat.weging + 'x' : undefined,
                isSamengesteld: resultaat.type === 'SamengesteldeToetsKolom',
                heeftHerkansing: !!resultaat.formattedHerkansing1Alternatief || !!resultaat.formattedHerkansing2Alternatief,
                heeftOpmerking: !!resultaat.opmerkingen,
                isVoldoende: bepaalIsVoldoende(resultaat.type, resultaat.weging, resultaat.isVoldoendeAlternatief),
                laatstePoging: getLaatstePoging(resultaat.formattedHerkansing1Alternatief, resultaat.formattedHerkansing2Alternatief),
                geldendResultaat: resultaat,
                pogingen: pogingen
            };
        })
        .filter((resultaat) => !!resultaat) as ToetsResultaat<SGeldendVoortgangsdossierResultaat>[];
}

export function getGeldendeInvoerDatum(resultaat: SGeldendResultaat): Date | undefined {
    switch (resultaat.herkansingsnummer ?? 0) {
        case 0:
            return resultaat.datumInvoerEerstePoging;
        case 1:
            return resultaat.datumInvoerHerkansing1;
        case 2:
            return resultaat.datumInvoerHerkansing2;
        default:
            return undefined;
    }
}

export function getPogingData(
    poging: Poging,
    resultaat?: string,
    isVoldoende?: boolean,
    datum?: Date,
    opmerking?: string
): PogingData | undefined {
    if (!resultaat || !datum) {
        return undefined;
    }

    let omschrijving = '';
    if (poging === 0) omschrijving = 'Eerste poging';
    if (poging === 1) omschrijving = 'Herkansing';
    if (poging === 2) omschrijving = 'Tweede herkansing';

    return {
        omschrijving: omschrijving,
        resultaat: resultaat,
        isOnvoldoende: isVoldoende === false,
        datum: formatCijferDate(datum),
        opmerking: opmerking
    };
}

/**
 * Een toets kan zowel in het voortgangsdossier als in het examendossier terugkomen.
 * In dat geval moet bij het Toetsresultaat ook de weging van het andere dossier worden vastgelegd.
 */
export function combineerWegingen(voortgangsdossier: VakVoortgangsdossier | undefined, examendossier: VakExamendossier | undefined) {
    if (!voortgangsdossier || !examendossier) {
        return;
    }

    // Een resultaat kan zowel in voortgangsdossier als examendossier zitten.
    // Middels deze map ontdubbelen we dezelfde resultaten.
    const examenResultatenMap: Map<number, ToetsResultaat<SGeldendResultaat>> = new Map();
    examendossier.resultaten.forEach((examenResultaat) => {
        examenResultatenMap.set(examenResultaat.geldendResultaat.resultaatkolom, examenResultaat);
    });

    Object.entries(voortgangsdossier.standaardNiveau.perioden)
        .flatMap((entry) => entry[1].toetsResultaten)
        .forEach((voortgangsResultaat) => {
            const examenResultaat = examenResultatenMap.get(voortgangsResultaat.geldendResultaat.resultaatkolom);
            if (examenResultaat) {
                voortgangsResultaat.wegingExamen = examenResultaat.wegingExamen;
                examenResultaat.wegingVoortgang = voortgangsResultaat.wegingVoortgang;
            }
        });
}

function getLaatstePoging(herkansing1: string | undefined, herkansing2: string | undefined): Poging {
    if (herkansing2) return 2;
    if (herkansing1) return 1;

    return 0;
}

function bepaalIsVoldoende(type: Toetstype, weging: number, isVoldoende?: boolean) {
    if (
        [
            'CentraalExamenkolom',
            'PeriodeGemiddeldeKolom',
            'RapportGemiddeldeKolom',
            'RapportCijferKolom',
            'SEGemiddeldeKolom',
            'SECijferKolom',
            'ExamenGemiddeldeKolom',
            'ExamenCijferKolom',
            'ToetssoortGemiddeldeKolom'
        ].includes(type)
    ) {
        return formatIsVoldoende(1, true, isVoldoende);
    } else {
        return formatIsVoldoende(weging, true, isVoldoende);
    }
}

function getResultaatVanType(resultaten: SGeldendResultaat[], type: Toetstype): SGeldendResultaat | undefined {
    return resultaten.find((resultaat) => resultaat.type === type);
}

function getResultatenVanType<T extends SGeldendResultaat>(resultaten: T[], types: Toetstype[]): T[] {
    return resultaten.filter((resultaat) => types.includes(resultaat.type));
}

//////////////////////////////////////////////////////////////////////////
//////             Functies ten bate van het testen                 //////
//////////////////////////////////////////////////////////////////////////

export function createDummyToetsResultaat(resultaatkolom: number): ToetsResultaat<SGeldendResultaat> {
    return {
        datum: 'gisteren',
        heeftHerkansing: false,
        heeftOpmerking: false,
        isSamengesteld: false,
        isVoldoende: 'voldoende',
        naam: 'toets',
        resultaat: 'CIJF1',
        pogingen: [],
        laatstePoging: 0,
        geldendResultaat: { ...createDummyResultaat(1), resultaatkolom: resultaatkolom }
    };
}

export function createDummyExamenDossier(resultaten: ToetsResultaat<SGeldendResultaat>[]): VakExamendossier {
    return {
        seCijfer: '8.0',
        isOnvoldoende: false,
        vaknaam: 'Engels',
        toetssoortGemiddelden: [],
        resultaten: resultaten,
        heeftResultaten: true
    };
}

export function createDummyToetssoortGemiddelde(): ToetssoortGemiddelde {
    return {
        naam: 'test',
        isOnvoldoende: false,
        resultaat: '8.0',
        geldendResultaat: createDummyResultaat(1)
    };
}

export function createDummyVoortgangsNiveau(resultaten: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[]) {
    return {
        naam: 'Standaard',
        perioden: [
            {
                periode: 1,
                toetsResultaten: resultaten,
                afkorting: 'P1'
            }
        ],
        heeftResultaten: resultaten?.length > 0
    };
}

export function createDummyVoortgangsDossier(resultaten: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[]): VakVoortgangsdossier {
    return {
        lichtingUuid: 'lichting',
        vaknaam: 'vak',
        standaardNiveau: createDummyVoortgangsNiveau(resultaten)
    };
}

export function createDummySVakVoortgangsResultaat(
    geldendVoortgangsResultaten: SGeldendVoortgangsdossierResultaat[]
): SVakVoortgangsResultaat {
    return {
        vakUuid: 'vak-uuid-1',
        lichtingUuid: 'lichting-uuid-1',
        geldendVoortgangsResultaten: geldendVoortgangsResultaten
    };
}

export function createDummySVakExamenResultaat(geldendResultaten: SGeldendResultaat[]): SVakExamenResultaat {
    return {
        vakUuid: 'vak-uuid-1',
        lichtingUuid: 'lichting-uuid-1',
        geldendExamenResultaten: geldendResultaten
    };
}
