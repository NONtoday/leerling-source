import {
    RDeeltoetskolom,
    RGeldendResultaat,
    RGeldendVoortgangsdossierResultaat,
    RLeerlingAnderVakKolom,
    RToetskolom
} from 'leerling-codegen';
import {
    DEFAULT_BOOLEAN,
    DEFAULT_NUMBER,
    DEFAULT_STRING,
    SEntiteit,
    getAdditionalBoolean,
    getAdditionalNumber,
    getAdditionalString,
    getEntiteitId,
    parseOptionalDate
} from '../util/entiteit-model';
import { SVak, mapVak } from '../vakkeuze/vakkeuze-model';

export const ADDITIONAL_VAKNAAM = 'vaknaam';
export const ADDITIONAL_RESULTAATKOLOM = 'resultaatkolom';
export const ADDITIONAL_NAAM_STANDAARD_NIVEAU = 'naamstandaardniveau';
export const ADDITIONAL_NAAM_ALTERNATIEF_NIVEAU = 'naamalternatiefniveau';
export const ADDITIONAL_HEEFT_ALTERNATIEF_NIVEAU = 'heeftalternatiefniveau';
export const ADDITIONAL_VAK_UUID = 'vakuuid';
export const ADDITIONAL_LICHTING_UUID = 'lichtinguuid';
export const ADDITIONAL_PERIODE_AFKORTING = 'periodeAfkorting';

export const ADDITIONAL_RESULTAATKOLOM_LEERJAAR = 'leerjaar';

export type DossierType = 'Voortgang' | 'Examen';

export type Herkansingssoort =
    | 'Geen'
    | 'EenKeerHoogste'
    | 'EenKeerLaatste'
    | 'TweeKeerHoogste'
    | 'TweeKeerLaatste'
    | 'EenkeerGemiddeld'
    | 'TweeKeerGemiddeld';

export type Toetstype =
    | 'Toetskolom'
    | 'SamengesteldeToetsKolom'
    | 'DeeltoetsKolom'
    | 'RapportToetskolom'
    | 'Werkstukcijferkolom'
    | 'CentraalExamenkolom'
    | 'DeelCentraalExamenkolom'
    | 'Advieskolom'
    | 'PeriodeGemiddeldeKolom'
    | 'RapportGemiddeldeKolom'
    | 'RapportCijferKolom'
    | 'SEGemiddeldeKolom'
    | 'SECijferKolom'
    | 'ExamenGemiddeldeKolom'
    | 'ExamenCijferKolom'
    | 'CentraalExamenVariantKolom'
    | 'ToetssoortGemiddeldeKolom'
    | 'BRONEindcijfer';

export interface SGeldendResultaat extends SEntiteit {
    dossierType: DossierType;
    isVoldoende?: boolean;
    isVoldoendeEerstePoging?: boolean;
    isVoldoendeHerkansing1?: boolean;
    isVoldoendeHerkansing2?: boolean;
    periode?: number;
    formattedResultaat?: string;
    formattedEerstePoging?: string;
    formattedHerkansing1?: string;
    formattedHerkansing2?: string;
    opmerkingen?: string;
    opmerkingenEerstePoging?: string;
    opmerkingenHerkansing1?: string;
    opmerkingenHerkansing2?: string;
    herkansingsnummer?: number;
    volgnummer?: number;
    type: Toetstype;
    toetscode?: string;
    omschrijving: string;
    weging: number;
    bijzonderheid?: 'TeltNietMee' | 'NietGemaakt' | 'Vrijstelling';
    datumInvoerEerstePoging?: Date;
    datumInvoerHerkansing1?: Date;
    datumInvoerHerkansing2?: Date;
    vakNaam: string;
    resultaatkolom: number;
    herkansingssoort: Herkansingssoort;
    isLabel: boolean;
    isCijfer: boolean;
    toetssoort: string;
    vakUuid: string;
    lichtingUuid: string;
    anderVakKolom?: SResultaatAnderVakKolom;
    leerjaar: number;
}

export interface SToetskolom extends SEntiteit {
    dossierType: DossierType;
    periode?: number;
    periodeAfkorting?: string;
    volgnummer?: number;
    type: Toetstype;
    toetscode?: string;
    omschrijving: string;
    weging: number;
    herkansingssoort: Herkansingssoort;
    vakUuid: string;
    lichtingUuid: string;
    isLabel: boolean;
    toetsSoort: string;
    leerjaar: number;
}

export interface SResultaatAnderVakKolom {
    vak: SVak;
    weging: number;
    examenWeging: number;
    lichtingUuid: string;
    lichtingnaam: string;
    resultaatkolomType: Toetstype;
    periode: number;
    periodeAfkorting?: string;
}

export interface SGeldendVoortgangsdossierResultaat extends SGeldendResultaat {
    isVoldoendeAlternatief?: boolean;
    formattedResultaatAlternatief?: string;
    formattedEerstePogingAlternatief?: string;
    formattedHerkansing1Alternatief?: string;
    formattedHerkansing2Alternatief?: string;
    isVoldoendeAlternatiefEerstePoging?: boolean;
    isVoldoendeAlternatiefHerkansing1?: boolean;
    isVoldoendeAlternatiefHerkansing2?: boolean;
    naamAlternatiefNiveau?: string;
    heeftAlternatiefNiveau?: boolean;
    naamStandaardNiveau?: string;
    herkansingsnummerAlternatief?: number;
    periodeAfkorting?: string;
}

export function mapOmschrijving(omschrijving: string | undefined, anderVakKolom: SResultaatAnderVakKolom | undefined): string | undefined {
    let result = omschrijving;

    if (anderVakKolom) {
        if (anderVakKolom.resultaatkolomType === 'RapportGemiddeldeKolom') {
            result = `Rapportgemiddelde van periode ${anderVakKolom?.periodeAfkorting ?? anderVakKolom.periode}`;
        } else if (anderVakKolom.resultaatkolomType === 'RapportCijferKolom') {
            result = `Rapportcijfer van periode ${anderVakKolom?.periodeAfkorting ?? anderVakKolom.periode}`;
        } else if (SE_CIJFER_KOLOM_TYPES.includes(anderVakKolom.resultaatkolomType)) {
            result = 'Examencijfer';
        }
        result = (result ?? DEFAULT_STRING) + ' geïmporteerd uit ' + anderVakKolom.vak.naam;
    }

    return formatOmschrijving(result);
}

export function mapGeldendResultaat(dossierType: DossierType, rGeldendResultaat: RGeldendResultaat): SGeldendResultaat {
    const anderVakKolom = mapAnderVakKolom(rGeldendResultaat.resultaatAnderVakKolom);

    return {
        dossierType: dossierType,
        id: getEntiteitId(rGeldendResultaat),
        isVoldoende: rGeldendResultaat.isVoldoende,
        isVoldoendeEerstePoging: rGeldendResultaat.isVoldoendeEerstePoging,
        isVoldoendeHerkansing1: rGeldendResultaat.isVoldoendeHerkansing1,
        isVoldoendeHerkansing2: rGeldendResultaat.isVoldoendeHerkansing2,
        periode: rGeldendResultaat.periode,
        formattedResultaat: stripNietGemaaktPostfix(rGeldendResultaat.formattedResultaat),
        formattedEerstePoging: stripNietGemaaktPostfix(rGeldendResultaat.formattedEerstePoging),
        formattedHerkansing1: stripNietGemaaktPostfix(rGeldendResultaat.formattedHerkansing1),
        formattedHerkansing2: stripNietGemaaktPostfix(rGeldendResultaat.formattedHerkansing2),
        opmerkingen: rGeldendResultaat.opmerkingen,
        opmerkingenEerstePoging: rGeldendResultaat.opmerkingenEerstePoging,
        opmerkingenHerkansing1: rGeldendResultaat.opmerkingenHerkansing1,
        opmerkingenHerkansing2: rGeldendResultaat.opmerkingenHerkansing2,
        herkansingsnummer: rGeldendResultaat.herkansingsnummer,
        volgnummer: rGeldendResultaat.volgnummer,
        type: rGeldendResultaat.type ?? 'Toetskolom',
        toetscode: rGeldendResultaat.toetscode,
        omschrijving: mapOmschrijving(rGeldendResultaat.omschrijving, anderVakKolom) ?? DEFAULT_STRING,
        weging: rGeldendResultaat.weging ?? DEFAULT_NUMBER,
        bijzonderheid: rGeldendResultaat.bijzonderheid,
        datumInvoerEerstePoging: parseOptionalDate(rGeldendResultaat.datumInvoerEerstePoging),
        datumInvoerHerkansing1: parseOptionalDate(rGeldendResultaat.datumInvoerHerkansing1),
        datumInvoerHerkansing2: parseOptionalDate(rGeldendResultaat.datumInvoerHerkansing2),
        vakNaam: getAdditionalString(rGeldendResultaat, ADDITIONAL_VAKNAAM) ?? DEFAULT_STRING,
        resultaatkolom: getAdditionalNumber(rGeldendResultaat, ADDITIONAL_RESULTAATKOLOM) ?? DEFAULT_NUMBER,
        herkansingssoort: rGeldendResultaat.herkansing ?? 'Geen',
        isLabel: rGeldendResultaat.isLabel ?? DEFAULT_BOOLEAN,
        isCijfer: rGeldendResultaat.isCijfer ?? DEFAULT_BOOLEAN,
        toetssoort: rGeldendResultaat.toetssoort ?? '',
        vakUuid: getAdditionalString(rGeldendResultaat, ADDITIONAL_VAK_UUID) ?? '',
        lichtingUuid: getAdditionalString(rGeldendResultaat, ADDITIONAL_LICHTING_UUID) ?? '',
        leerjaar: getAdditionalNumber(rGeldendResultaat, ADDITIONAL_RESULTAATKOLOM_LEERJAAR) ?? DEFAULT_NUMBER,
        anderVakKolom: anderVakKolom
    };
}

function findToetstype(rKolom: RToetskolom): Toetstype {
    const type = (rKolom as any).$type;
    if (type === 'resultaten.kolommen.RSamengesteldeToetskolom') {
        return 'SamengesteldeToetsKolom';
    }
    if (type === 'resultaten.kolommen.RDeeltoetskolom') {
        return 'DeeltoetsKolom';
    }
    if (type === 'resultaten.kolommen.RDeelCentraalExamenkolom') {
        return 'DeelCentraalExamenkolom';
    }
    return 'Toetskolom';
}

function findWeging(type: DossierType, rKolom: RToetskolom): number {
    if (findToetstype(rKolom) === 'DeeltoetsKolom') {
        return (rKolom as RDeeltoetskolom).deeltoetsWeging ?? DEFAULT_NUMBER;
    }
    if (type === 'Voortgang') return rKolom.weging ?? DEFAULT_NUMBER;
    else return rKolom.examenWeging ?? DEFAULT_NUMBER;
}

function mapToetskolom(type: DossierType, rKolom: RToetskolom, vakUUID: string | undefined, lichtingUUID: string | undefined): SToetskolom {
    return {
        dossierType: type,
        id: getEntiteitId(rKolom),
        periode: rKolom.periode,
        periodeAfkorting: getAdditionalString(rKolom, ADDITIONAL_PERIODE_AFKORTING),
        volgnummer: rKolom.volgnummer,
        type: findToetstype(rKolom),
        toetscode: rKolom.toetscode,
        omschrijving: formatOmschrijving(rKolom.omschrijving) ?? DEFAULT_STRING,
        weging: findWeging(type, rKolom),
        herkansingssoort: rKolom.herkansing ?? 'Geen',
        vakUuid: vakUUID ?? '',
        lichtingUuid: lichtingUUID ?? '',
        isLabel: rKolom.resultaatLabelLijst !== undefined,
        toetsSoort: rKolom.toetsSoort?.naam ?? '',
        leerjaar: rKolom.leerjaar ?? DEFAULT_NUMBER
    };
}

function mapAnderVakKolom(anderVakKolom: RLeerlingAnderVakKolom | undefined): SResultaatAnderVakKolom | undefined {
    return anderVakKolom && anderVakKolom.anderVak
        ? {
              vak: mapVak(anderVakKolom.anderVak),
              weging: anderVakKolom.weging ?? DEFAULT_NUMBER,
              examenWeging: anderVakKolom.examenWeging ?? DEFAULT_NUMBER,
              lichtingUuid: anderVakKolom.lichting?.UUID ?? DEFAULT_STRING,
              lichtingnaam: anderVakKolom.lichting?.naam ?? DEFAULT_STRING,
              resultaatkolomType: anderVakKolom.resultaatkolomType ?? 'Toetskolom',
              periode: anderVakKolom?.periode ?? DEFAULT_NUMBER,
              periodeAfkorting: anderVakKolom?.periodeAfkorting
          }
        : undefined;
}

export function mapGeldendVoortgangsdossierResultaat(
    rGeldendVoortgangsdossierResultaat: RGeldendVoortgangsdossierResultaat
): SGeldendVoortgangsdossierResultaat {
    const geldendResultaat = mapGeldendResultaat('Voortgang', rGeldendVoortgangsdossierResultaat);

    return {
        ...geldendResultaat,
        isVoldoendeAlternatief: rGeldendVoortgangsdossierResultaat.isVoldoendeAlternatief,
        formattedResultaatAlternatief: rGeldendVoortgangsdossierResultaat.formattedResultaatAlternatief,
        formattedEerstePogingAlternatief: rGeldendVoortgangsdossierResultaat.formattedEerstePogingAlternatief,
        formattedHerkansing1Alternatief: rGeldendVoortgangsdossierResultaat.formattedHerkansing1Alternatief,
        formattedHerkansing2Alternatief: rGeldendVoortgangsdossierResultaat.formattedHerkansing2Alternatief,
        isVoldoendeAlternatiefEerstePoging: rGeldendVoortgangsdossierResultaat.isVoldoendeAlternatiefEerstePoging,
        isVoldoendeAlternatiefHerkansing1: rGeldendVoortgangsdossierResultaat.isVoldoendeAlternatiefHerkansing1,
        isVoldoendeAlternatiefHerkansing2: rGeldendVoortgangsdossierResultaat.isVoldoendeAlternatiefHerkansing2,
        herkansingsnummerAlternatief: rGeldendVoortgangsdossierResultaat.herkansingsnummerAlternatief,
        naamAlternatiefNiveau: getAdditionalString(rGeldendVoortgangsdossierResultaat, ADDITIONAL_NAAM_ALTERNATIEF_NIVEAU),
        heeftAlternatiefNiveau: getAdditionalBoolean(rGeldendVoortgangsdossierResultaat, ADDITIONAL_HEEFT_ALTERNATIEF_NIVEAU),
        naamStandaardNiveau: getAdditionalString(rGeldendVoortgangsdossierResultaat, ADDITIONAL_NAAM_STANDAARD_NIVEAU),
        periodeAfkorting: getAdditionalString(rGeldendVoortgangsdossierResultaat, ADDITIONAL_PERIODE_AFKORTING)
    };
}

export function createGeldendVoortgangsdossierResultaten(rGeldendResultaten: RGeldendVoortgangsdossierResultaat[]): SGeldendResultaat[] {
    const geldendResultaten: SGeldendResultaat[] = [];
    rGeldendResultaten.forEach((rGeldendResultaat) => geldendResultaten.push(mapGeldendVoortgangsdossierResultaat(rGeldendResultaat)));
    return geldendResultaten;
}

export function createGeldendExamendossierResultaten(rGeldendResultaten: RGeldendResultaat[]): SGeldendResultaat[] {
    const geldendResultaten: SGeldendResultaat[] = [];
    rGeldendResultaten.forEach((rGeldendResultaat) => geldendResultaten.push(mapGeldendResultaat('Examen', rGeldendResultaat)));
    return geldendResultaten;
}

function createToetsKolommen(
    kolommen: RToetskolom[] = [],
    type: DossierType,
    vakUUID: string | undefined,
    lichtingUUID: string | undefined
): SToetskolom[] {
    const sKolommen: SToetskolom[] = [];
    kolommen.forEach((rKolom) => sKolommen.push(mapToetskolom(type, rKolom, vakUUID, lichtingUUID)));
    return sKolommen;
}
export function createVoortgangsToetskolommen(
    toetskolommen: RToetskolom[] = [],
    vakUUID: string | undefined,
    lichtingUUID: string | undefined
): SToetskolom[] {
    return createToetsKolommen(toetskolommen, 'Voortgang', vakUUID, lichtingUUID);
}

export function createExamenToetskolommen(toetskolommen: RToetskolom[] = [], vakUUID?: string, lichtingUUID?: string): SToetskolom[] {
    return createToetsKolommen(toetskolommen, 'Examen', vakUUID, lichtingUUID);
}
// Bij bijzonderheid NietGemaakt wordt er een ! achter het resultaat geplaatst, filter deze uit de weergave.
function stripNietGemaaktPostfix(formattedResultaat: string | undefined): string | undefined {
    return formattedResultaat?.endsWith(' !') ? formattedResultaat.substring(0, formattedResultaat.length - 2) : formattedResultaat;
}

function formatOmschrijving(omschrijving?: string): string | undefined {
    if (!omschrijving) {
        return omschrijving;
    }
    return omschrijving.replace(/(\r\n|\n|\r)/gm, ' ');
}

const SE_CIJFER_KOLOM_TYPES: Toetstype[] = ['SEGemiddeldeKolom', 'SECijferKolom'];

export function isGeimporteerdSeResultaat(resultaat: SGeldendResultaat) {
    return resultaat.anderVakKolom && SE_CIJFER_KOLOM_TYPES.includes(resultaat.anderVakKolom.resultaatkolomType);
}
