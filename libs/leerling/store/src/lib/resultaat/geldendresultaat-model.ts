import { RGeldendResultaat, RGeldendVoortgangsdossierResultaat, RLeerlingAnderVakKolom } from 'leerling-codegen';
import {
    DEFAULT_BOOLEAN,
    DEFAULT_NUMBER,
    DEFAULT_STRING,
    SEntiteit,
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
export const ADDITIONAL_VAK_UUID = 'vakuuid';
export const ADDITIONAL_LICHTING_UUID = 'lichtinguuid';

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
}

export interface SResultaatAnderVakKolom {
    vak: SVak;
    weging: number;
    examenWeging: number;
    lichtingUuid: string;
    lichtingnaam: string;
    resultaatkolomType: string;
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
    naamStandaardNiveau?: string;
    herkansingsnummerAlternatief?: number;
}

export function mapGeldendResultaat(dossierType: DossierType, rGeldendResultaat: RGeldendResultaat): SGeldendResultaat {
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
        omschrijving: formatOmschrijving(rGeldendResultaat.omschrijving) ?? DEFAULT_STRING,
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
        anderVakKolom: mapAnderVakKolom(rGeldendResultaat.resultaatAnderVakKolom)
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
              resultaatkolomType: anderVakKolom.resultaatkolomType ?? 'Toetskolom'
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
        naamStandaardNiveau: getAdditionalString(rGeldendVoortgangsdossierResultaat, ADDITIONAL_NAAM_STANDAARD_NIVEAU)
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
    return resultaat.anderVakKolom && SE_CIJFER_KOLOM_TYPES.includes(resultaat.anderVakKolom.resultaatkolomType as Toetstype);
}
