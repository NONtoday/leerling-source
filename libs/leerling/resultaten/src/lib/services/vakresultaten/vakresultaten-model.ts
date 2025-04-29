import { isPresent } from 'harmony';
import {
    SGeldendResultaat,
    SGeldendVoortgangsdossierResultaat,
    SToetskolom,
    SToetskolommen,
    SVakExamenResultaat,
    SVakVoortgangsResultaat,
    Toetstype,
    createDummyResultaat
} from 'leerling/store';
import { orderBy, upperFirst } from 'lodash-es';
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
    isLeegResultaat: boolean;
    wegingVoortgang?: string;
    wegingExamen?: string;

    isSamengesteld: boolean;
    heeftHerkansing: boolean;
    heeftOpmerking: boolean;
    isVoldoende: IsVoldoendeType;
    laatstePoging?: Poging;
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
    isLeegRapportCijfer?: boolean;
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

export function mapToVakVoortgangsdossier(
    vakVoortgangsResultaat: SVakVoortgangsResultaat,
    kolommen?: SToetskolommen
): VakVoortgangsdossier | undefined {
    if (!vakVoortgangsResultaat) {
        return undefined;
    }

    const voortgangsResultaten = vakVoortgangsResultaat.geldendVoortgangsResultaten;
    if (voortgangsResultaten.length === 0 && (!kolommen || kolommen.resultaatKolommen?.length === 0)) {
        return {
            vaknaam: '',
            lichtingUuid: '',
            standaardNiveau: { naam: '', perioden: [], heeftResultaten: false }
        };
    }

    const alternatiefNiveau = getAlternatiefNiveau(voortgangsResultaten, kolommen);

    return {
        vaknaam: voortgangsResultaten && voortgangsResultaten.length > 0 ? upperFirst(voortgangsResultaten[0].vakNaam) : '',
        lichtingUuid: vakVoortgangsResultaat.lichtingUuid ?? '',
        plaatsingUuid: vakVoortgangsResultaat.plaatsingUuid ?? '',
        standaardNiveau: getStandaardNiveau(voortgangsResultaten, kolommen),
        alternatiefNiveau: alternatiefNiveau
    };
}

const TOETS_TOETSTYPEN: Toetstype[] = ['Toetskolom', 'SamengesteldeToetsKolom', 'Werkstukcijferkolom', 'Advieskolom', 'RapportToetskolom'];

function getStandaardNiveau(voortgangsResultaten: SGeldendVoortgangsdossierResultaat[], kolommen?: SToetskolommen): VoortgangsNiveau {
    const toetsResultaten = getResultaten(voortgangsResultaten, TOETS_TOETSTYPEN);
    const periodeGemiddelden = getResultaten(voortgangsResultaten, ['PeriodeGemiddeldeKolom']);
    const rapportGemiddelden = getResultaten(voortgangsResultaten, ['RapportGemiddeldeKolom']);
    const rapportCijfers = getResultaten(voortgangsResultaten, ['RapportCijferKolom']);
    const perioden = getPerioden(toetsResultaten, periodeGemiddelden, rapportGemiddelden, rapportCijfers, kolommen);
    const heeftResultaten =
        toetsResultaten.length > 0 || periodeGemiddelden.length > 0 || rapportGemiddelden.length > 0 || rapportCijfers.length > 0;
    const heeftResultatenOfKolommen = heeftResultaten || (kolommen && kolommen.resultaatKolommen?.length > 0);
    const optionalStandaardNiveauNaam = perioden
        .map((periode) => periode.toetsResultaten)
        .flat()
        .map((res) => res.geldendResultaat)
        .flat()
        .find((gResult) => gResult.naamStandaardNiveau)?.naamStandaardNiveau;
    return {
        naam: optionalStandaardNiveauNaam ? upperFirst(optionalStandaardNiveauNaam) : 'Standaard',
        perioden: perioden,
        heeftResultaten: heeftResultatenOfKolommen
    } as VoortgangsNiveau;
}

function getAlternatiefNiveau(
    voortgangsResultaten: SGeldendVoortgangsdossierResultaat[],
    kolommen?: SToetskolommen
): VoortgangsNiveau | undefined {
    const toetsResultaten = getAlternatieveResultaten(voortgangsResultaten, TOETS_TOETSTYPEN);
    const periodeGemiddelden = getAlternatieveResultaten(voortgangsResultaten, ['PeriodeGemiddeldeKolom']);
    const rapportGemiddelden = getAlternatieveResultaten(voortgangsResultaten, ['RapportGemiddeldeKolom']);
    const rapportCijfers = getAlternatieveResultaten(voortgangsResultaten, ['RapportCijferKolom']);
    const perioden = getPerioden(toetsResultaten, periodeGemiddelden, rapportGemiddelden, rapportCijfers, kolommen);

    const heeftResultaten =
        toetsResultaten.length > 0 || periodeGemiddelden.length > 0 || rapportGemiddelden.length > 0 || rapportCijfers.length > 0;

    const geldendResultaten = perioden
        .map((periode) => periode.toetsResultaten)
        .flat()
        .map((res) => res.geldendResultaat)
        .flat();

    const heeftAlternatiefNiveau = geldendResultaten.find((gResult) => gResult.heeftAlternatiefNiveau);
    if (!heeftAlternatiefNiveau || !heeftResultaten) {
        // Als het in Core gedefinieerd is dat er een alternatief niveau is en er zijn ook echt alternatieve resultaten, dan tonen we het alternatieve niveau.
        return undefined;
    }

    const optionalAlternatiefNiveauNaam = geldendResultaten.find((gResult) => gResult.naamAlternatiefNiveau)?.naamAlternatiefNiveau;
    return {
        naam: optionalAlternatiefNiveauNaam ? upperFirst(optionalAlternatiefNiveauNaam) : 'Alternatief',
        perioden: perioden,
        heeftResultaten: heeftResultaten
    };
}

function geldendeOfEerstGevondenOpmerking(resultaat: ToetsResultaat<SGeldendVoortgangsdossierResultaat>) {
    if (resultaat.geldendResultaat?.opmerkingen) return resultaat.geldendResultaat.opmerkingen;
    return !resultaat.geldendResultaat.formattedResultaat || resultaat.geldendResultaat.formattedResultaat === '-'
        ? resultaat.pogingen?.map((poging) => poging.opmerking).find((opmerking) => opmerking?.trim() !== '')
        : undefined;
}

function getPerioden(
    resultaten: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[],
    periodeGemiddelden: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[],
    rapportGemiddelden: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[],
    rapportCijfers: ToetsResultaat<SGeldendVoortgangsdossierResultaat>[],
    kolommen?: SToetskolommen
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
        voortgangsPeriode.isLeegRapportCijfer = resultaat.isLeegResultaat;
        voortgangsPeriode.rapportCijferIsOnvoldoende = resultaat.isVoldoende === 'onvoldoende';
        voortgangsPeriode.rapportCijferOpmerking = geldendeOfEerstGevondenOpmerking(resultaat);
    });
    if (kolommen) {
        vulKolomPerioden(perioden, kolommen, (voortgangsPeriode, kolom) => {
            voortgangsPeriode.toetsResultaten.push(createEmptyKolomVoortgangsResultaat(kolom));
        });
    }

    const periodeNummers = Object.keys(perioden) as object as number[];
    periodeNummers.forEach((periode) => {
        perioden[periode].toetsResultaten = orderByLeerjaarEnVolgnummer(perioden[periode].toetsResultaten);
    });

    return Object.values(perioden);
}

function emptyGeldendResultaat(kolom: SToetskolom): SGeldendResultaat {
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

function emptyGeldendVoortgangsResultaat(kolom: SToetskolom) {
    return emptyGeldendResultaat(kolom) as SGeldendVoortgangsdossierResultaat;
}
function createEmptyKolomVoortgangsResultaat(kolom: SToetskolom): ToetsResultaat<SGeldendVoortgangsdossierResultaat> {
    return {
        naam: kolom.omschrijving,
        datum: '',
        resultaat: '',
        isLeegResultaat: true,
        wegingVoortgang: kolom.weging !== undefined ? kolom.weging + 'x' : undefined,
        isSamengesteld: kolom.type === 'SamengesteldeToetsKolom',
        heeftHerkansing: kolom.herkansingssoort !== 'Geen',
        heeftOpmerking: false,
        isVoldoende: 'neutraal',
        geldendResultaat: emptyGeldendVoortgangsResultaat(kolom),
        pogingen: []
    };
}

function createEmptyKolomExamenResultaat(kolom: SToetskolom): ToetsResultaat<SGeldendResultaat> {
    return {
        naam: kolom.omschrijving,
        datum: '',
        resultaat: '',
        isLeegResultaat: true,
        wegingExamen: kolom.weging !== undefined ? kolom.weging + 'x' : undefined,
        isSamengesteld: kolom.type === 'SamengesteldeToetsKolom',
        heeftHerkansing: kolom.herkansingssoort !== 'Geen',
        heeftOpmerking: false,
        isVoldoende: 'neutraal',
        geldendResultaat: emptyGeldendResultaat(kolom),
        pogingen: []
    };
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

function vulKolomPerioden(
    perioden: { [periode: number]: VoortgangsPeriode },
    kolommen: SToetskolommen,
    vulPeriode: (voortgangsPeriode: VoortgangsPeriode, kolom: SToetskolom) => void
) {
    kolommen.resultaatKolommen?.forEach((kolom) => {
        const periodeNummer = kolom.periode ?? 0;

        let voortgangsPeriode = perioden[periodeNummer];
        if (voortgangsPeriode === undefined) {
            voortgangsPeriode = {
                periode: periodeNummer,
                afkorting: kolom.periodeAfkorting,
                toetsResultaten: []
            };
            perioden[periodeNummer] = voortgangsPeriode;
        }
        const resultaatVoorKolom = voortgangsPeriode.toetsResultaten.find(
            (resultaat) => resultaat.geldendResultaat?.resultaatkolom == kolom.id
        );
        if (!resultaatVoorKolom) {
            vulPeriode(voortgangsPeriode, kolom);
        }
    });
}

function examenResultaatKolommen(
    examenResultaten: SGeldendResultaat[],
    kolommen: SToetskolommen | undefined
): ToetsResultaat<SGeldendResultaat>[] {
    const resultaten: ToetsResultaat<SGeldendResultaat>[] = [];
    if (!kolommen || !kolommen.resultaatKolommen) {
        return resultaten;
    }
    kolommen.resultaatKolommen.forEach((kolom) => {
        // let op geen resultaatkolom beschikbaar, obv naam en volgnummer.
        const resultaatVoorKolom = examenResultaten.find(
            (resultaat) => resultaat.omschrijving == kolom.omschrijving && resultaat.volgnummer === kolom.volgnummer
        );
        if (!resultaatVoorKolom) {
            resultaten.push(createEmptyKolomExamenResultaat(kolom));
        }
    });
    return resultaten;
}

function orderByLeerjaarEnVolgnummer(resultaten: ToetsResultaat<SGeldendResultaat>[]) {
    return orderBy(resultaten, ['geldendResultaat.leerjaar', 'geldendResultaat.volgnummer'], ['desc']);
}

export function mapToVakExamendossier(vakExamenResultaat: SVakExamenResultaat, kolommen?: SToetskolommen): VakExamendossier | undefined {
    if (!vakExamenResultaat && !kolommen) {
        return undefined;
    }
    const examenResultaten = vakExamenResultaat?.geldendExamenResultaten || [];
    const examenKolommen = kolommen?.resultaatKolommen || [];
    if (examenResultaten.length === 0 && examenKolommen.length === 0) {
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

    const toetssoortGemiddelden = [...getToetsoortGemiddelden(examenResultaten)];
    let resultaten = getResultaten(examenResultaten, ['Toetskolom', 'SamengesteldeToetsKolom', 'Werkstukcijferkolom']);

    const gefilterdeKolomResultaten = examenResultaatKolommen(examenResultaten, kolommen);
    resultaten = orderByLeerjaarEnVolgnummer(resultaten.concat(gefilterdeKolomResultaten));

    const heeftResultaten = toetssoortGemiddelden?.length > 0 || resultaten?.length > 0 || !!seResultaat;

    return {
        vaknaam: examenResultaten && examenResultaten[0] ? upperFirst(examenResultaten[0].vakNaam) : '',
        seCijfer: seResultaat,
        isOnvoldoende: seIsOnvoldoende,
        toetssoortGemiddelden: toetssoortGemiddelden,
        resultaten: resultaten,
        heeftResultaten: heeftResultaten
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

function heeftMinimaalEenOpmerking(resultaat: SGeldendResultaat): boolean {
    return !!(
        resultaat.opmerkingen ??
        resultaat.opmerkingenEerstePoging ??
        resultaat.opmerkingenHerkansing1 ??
        resultaat.opmerkingenHerkansing2
    );
}

function getResultaten<T extends SGeldendResultaat>(resultaten: T[], toetstypen: Toetstype[]): ToetsResultaat<T>[] {
    return getResultatenVanType(resultaten, toetstypen)
        .map((resultaat) => {
            if (!resultaat.formattedResultaat && !heeftMinimaalEenOpmerking(resultaat) && resultaat.type !== 'SamengesteldeToetsKolom') {
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
                resultaat: resultaat.formattedResultaat ?? '-',
                isLeegResultaat: resultaat.formattedResultaat === undefined,
                wegingVoortgang: resultaat.dossierType === 'Voortgang' ? resultaat.weging + 'x' : undefined,
                wegingExamen: resultaat.dossierType === 'Examen' ? resultaat.weging + 'x' : undefined,
                isSamengesteld: resultaat.type === 'SamengesteldeToetsKolom',
                heeftHerkansing:
                    !!resultaat.formattedHerkansing1 ||
                    !!resultaat.formattedHerkansing2 ||
                    !!resultaat.opmerkingenHerkansing1 ||
                    !!resultaat.opmerkingenHerkansing2,
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
            if (
                !resultaat.formattedResultaatAlternatief &&
                !heeftMinimaalEenOpmerking(resultaat) &&
                resultaat.type !== 'SamengesteldeToetsKolom'
            ) {
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
                resultaat: resultaat.formattedResultaatAlternatief ?? '-',
                isLeegResultaat: resultaat.formattedResultaatAlternatief === undefined,
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
    if (!(resultaat || opmerking) || !datum) {
        return undefined;
    }

    let omschrijving = '';
    if (poging === 0) omschrijving = 'Eerste poging';
    if (poging === 1) omschrijving = 'Herkansing';
    if (poging === 2) omschrijving = 'Tweede herkansing';

    return {
        omschrijving: omschrijving,
        resultaat: resultaat ?? '-',
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

export function createDummyToetsResultaat(resultaatkolom: number, leerjaar = 2): ToetsResultaat<SGeldendResultaat> {
    return {
        datum: 'gisteren',
        heeftHerkansing: false,
        heeftOpmerking: false,
        isSamengesteld: false,
        isVoldoende: 'voldoende',
        naam: 'toets',
        resultaat: 'CIJF1',
        isLeegResultaat: false,
        pogingen: [],
        laatstePoging: 0,
        geldendResultaat: { ...createDummyResultaat(1, leerjaar), resultaatkolom: resultaatkolom }
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

export function createDummySToetsKolommen(kolommen: SToetskolom[]): SToetskolommen {
    return {
        vakUuid: 'vak-uuid-1',
        lichtingUuid: 'lichting-uuid-1',
        resultaatKolommen: kolommen
    };
}
