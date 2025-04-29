import { differenceInCalendarDays, format, isSameYear } from 'date-fns';
import { Herkansingssoort, SGeldendResultaat, SGeldendVoortgangsdossierResultaat } from 'leerling/store';
import { upperFirst } from 'lodash-es';
import { GeldendePoging, IsVoldoendeType, formatIsVoldoende } from '../../components/resultaat-item/resultaat-item-model';

export type Poging = 0 | 1 | 2;

export interface SamengesteldeToetsDetails {
    omschrijving: string;
    formattedResultaat: string;
    isOnvoldoende: boolean;
}

export interface LaatsteResultaat {
    geldendResultaten: SGeldendResultaat[];
    herkansing: Poging;

    resultaat: string;
    isLeegResultaat: boolean;
    isVoldoende: IsVoldoendeType;
    omschrijving: string;
    vakNaam: string;
    opmerking?: string;
    toetssoort: string;
    weging: string;
    afwijkendeWegingExamen?: string;
    teltPogingMee: boolean;
    herkansingssoort: Herkansingssoort;
    heeftOpmerking: boolean;
    geldendePoging?: GeldendePoging;
    isHerkansing: boolean;
    isAlternatief: boolean;
    resultaatkolom: number;
    naamAlternatiefNiveau?: string;
    datum?: Date;
    formattedDate: string;
}

export function mapToLaatsteResultaat(geldendResultaat: SGeldendResultaat): LaatsteResultaat[] {
    const laatsteResultaten: LaatsteResultaat[] = [];

    const eerstePoging = formatResultaat(geldendResultaat.formattedEerstePoging, geldendResultaat.bijzonderheid);
    if (eerstePoging || geldendResultaat.opmerkingenEerstePoging) {
        laatsteResultaten.push(
            createLaatsteResultaatStandaard(
                geldendResultaat,
                eerstePoging,
                geldendResultaat.opmerkingenEerstePoging,
                geldendResultaat.isVoldoendeEerstePoging,
                geldendResultaat.datumInvoerEerstePoging
            )
        );
    }

    if (geldendResultaat.formattedHerkansing1 || geldendResultaat.opmerkingenHerkansing1) {
        laatsteResultaten.push(
            createLaatsteResultaatStandaard(
                geldendResultaat,
                geldendResultaat.formattedHerkansing1,
                geldendResultaat.opmerkingenHerkansing1,
                geldendResultaat.isVoldoendeHerkansing1,
                geldendResultaat.datumInvoerHerkansing1,
                1
            )
        );
    }

    if (geldendResultaat.formattedHerkansing2 || geldendResultaat.opmerkingenHerkansing2) {
        laatsteResultaten.push(
            createLaatsteResultaatStandaard(
                geldendResultaat,
                geldendResultaat.formattedHerkansing2,
                geldendResultaat.opmerkingenHerkansing2,
                geldendResultaat.isVoldoendeHerkansing2,
                geldendResultaat.datumInvoerHerkansing2,
                2
            )
        );
    }

    return laatsteResultaten;
}

export function mapVoortgangsdossierToLaatsteResultaat(
    geldendVoortgangsdossierResultaat: SGeldendVoortgangsdossierResultaat
): LaatsteResultaat[] {
    const laatsteResultaten = mapToLaatsteResultaat(geldendVoortgangsdossierResultaat);
    if (geldendVoortgangsdossierResultaat.formattedEerstePogingAlternatief) {
        laatsteResultaten.push(
            createLaatsteResultaatAlternatief(
                geldendVoortgangsdossierResultaat,
                geldendVoortgangsdossierResultaat.formattedEerstePogingAlternatief,
                geldendVoortgangsdossierResultaat.opmerkingenEerstePoging,
                geldendVoortgangsdossierResultaat.isVoldoendeAlternatiefEerstePoging,
                geldendVoortgangsdossierResultaat.naamAlternatiefNiveau,
                geldendVoortgangsdossierResultaat.datumInvoerEerstePoging
            )
        );
    }
    if (geldendVoortgangsdossierResultaat.formattedHerkansing1Alternatief) {
        laatsteResultaten.push(
            createLaatsteResultaatAlternatief(
                geldendVoortgangsdossierResultaat,
                geldendVoortgangsdossierResultaat.formattedHerkansing1Alternatief,
                geldendVoortgangsdossierResultaat.opmerkingenHerkansing1,
                geldendVoortgangsdossierResultaat.isVoldoendeAlternatiefHerkansing1,
                geldendVoortgangsdossierResultaat.naamAlternatiefNiveau,
                geldendVoortgangsdossierResultaat.datumInvoerHerkansing1,
                1
            )
        );
    }
    if (geldendVoortgangsdossierResultaat.formattedHerkansing2Alternatief) {
        laatsteResultaten.push(
            createLaatsteResultaatAlternatief(
                geldendVoortgangsdossierResultaat,
                geldendVoortgangsdossierResultaat.formattedHerkansing2Alternatief,
                geldendVoortgangsdossierResultaat.opmerkingenHerkansing2,
                geldendVoortgangsdossierResultaat.isVoldoendeAlternatiefHerkansing2,
                geldendVoortgangsdossierResultaat.naamAlternatiefNiveau,
                geldendVoortgangsdossierResultaat.datumInvoerHerkansing2,
                2
            )
        );
    }

    return laatsteResultaten;
}

function formatResultaat(formattedPoging?: string, bijzonderheid?: string): string | undefined {
    switch (bijzonderheid) {
        case 'TeltNietMee':
            return 'X';
        case 'NietGemaakt':
            return '*';
        case 'Vrijstelling':
            return 'vr';
    }

    if (formattedPoging) {
        return formattedPoging;
    }
    return undefined;
}

type Pogingen = { resultaat?: string; herkansing1?: string; herkansing2?: string };

function createGeldendePoging(poging: Poging, isOnvoldoende: boolean, pogingen: Pogingen, resultaat?: string): GeldendePoging | undefined {
    if (!resultaat || (!pogingen.herkansing1 && !pogingen.herkansing2)) {
        return undefined;
    }

    return {
        resultaat: resultaat ?? '',
        poging: poging,
        isOnvoldoende: isOnvoldoende
    };
}

function isGemiddelde(geldendResultaat: SGeldendResultaat): boolean {
    const soort: Herkansingssoort = geldendResultaat.herkansingssoort;
    return soort === 'EenkeerGemiddeld' || soort === 'TweeKeerGemiddeld';
}

function createLaatsteResultaatStandaard(
    geldendResultaat: SGeldendVoortgangsdossierResultaat,
    resultaat: string | undefined,
    opmerking: string | undefined,
    isVoldoende?: boolean,
    datum?: Date,
    herkansing?: Poging
): LaatsteResultaat {
    const pogingen: Pogingen = {
        resultaat: geldendResultaat.formattedResultaat,
        herkansing1: geldendResultaat.formattedHerkansing1,
        herkansing2: geldendResultaat.formattedHerkansing2
    };

    const teltPoging = isGemiddelde(geldendResultaat) || (geldendResultaat.herkansingsnummer || 0) === (herkansing ?? 0);
    const isVoldoendeType = formatIsVoldoende(geldendResultaat.weging, teltPoging, isVoldoende);

    return createLaatsteResultaat(
        geldendResultaat,
        resultaat,
        teltPoging,
        isVoldoendeType,
        false,
        herkansing ?? 0,
        opmerking,
        createGeldendePoging(
            getPoging(geldendResultaat.herkansingsnummer),
            geldendResultaat.isVoldoende === false,
            pogingen,
            geldendResultaat.formattedResultaat
        ),
        datum
    );
}

function createLaatsteResultaatAlternatief(
    geldendResultaat: SGeldendVoortgangsdossierResultaat,
    resultaat: string | undefined,
    opmerking: string | undefined,
    isVoldoende?: boolean,
    naamAlternatiefNiveau?: string,
    datum?: Date,
    herkansing?: Poging
): LaatsteResultaat {
    const pogingen: Pogingen = {
        resultaat: geldendResultaat.formattedResultaatAlternatief,
        herkansing1: geldendResultaat.formattedHerkansing1Alternatief,
        herkansing2: geldendResultaat.formattedHerkansing2Alternatief
    };
    const teltPoging = isGemiddelde(geldendResultaat) || (geldendResultaat.herkansingsnummerAlternatief || 0) === (herkansing ?? 0);

    const isVoldoendeType = formatIsVoldoende(geldendResultaat.weging, teltPoging, isVoldoende);

    return {
        ...createLaatsteResultaat(
            geldendResultaat,
            resultaat,
            teltPoging,
            isVoldoendeType,
            true,
            herkansing ?? 0,
            opmerking,
            createGeldendePoging(
                getPoging(geldendResultaat.herkansingsnummerAlternatief),
                geldendResultaat.isVoldoendeAlternatief === false,
                pogingen,
                geldendResultaat.formattedResultaatAlternatief
            ),
            datum
        ),
        naamAlternatiefNiveau: geldendResultaat.naamAlternatiefNiveau
    };
}

function getPoging(herkansingsnummer?: number): Poging {
    if (herkansingsnummer === 0 || herkansingsnummer === 1 || herkansingsnummer === 2) {
        return herkansingsnummer;
    }
    return 0;
}

function createLaatsteResultaat(
    geldendResultaat: SGeldendResultaat,
    resultaat: string | undefined,
    teltMee: boolean,
    isVoldoende: IsVoldoendeType,
    isAlternatief: boolean,
    herkansing: Poging,
    opmerking: string | undefined,
    geldendePoging?: GeldendePoging,
    datum?: Date
): LaatsteResultaat {
    const heeftOpmerking = Boolean(opmerking);
    const vakNaam = upperFirst(geldendResultaat.vakNaam);
    return {
        geldendResultaten: [geldendResultaat],
        herkansing: herkansing,
        resultaat: resultaat ?? '-',
        isLeegResultaat: resultaat === undefined,
        isVoldoende: isVoldoende,
        teltPogingMee: teltMee,
        weging: geldendResultaat.weging + 'x',
        geldendePoging: geldendePoging,
        toetssoort: geldendResultaat.toetssoort,
        herkansingssoort: geldendResultaat.herkansingssoort,
        omschrijving: geldendResultaat.omschrijving,
        vakNaam: vakNaam,
        heeftOpmerking: heeftOpmerking,
        opmerking: opmerking ? upperFirst(opmerking) : undefined,
        isHerkansing: herkansing !== undefined && herkansing > 0,
        datum: datum,
        formattedDate: formatCijferDate(datum),
        resultaatkolom: geldendResultaat.resultaatkolom,
        isAlternatief: isAlternatief
    };
}

export function formatCijferDate(datum?: Date): string {
    if (!datum) {
        return '';
    }

    const nu = new Date();
    const aantalTussenliggendeDagen = differenceInCalendarDays(nu, datum);
    if (aantalTussenliggendeDagen === 0) {
        return 'Vandaag';
    } else if (aantalTussenliggendeDagen === 1) {
        return 'Gisteren';
    }
    const dateFormat = isSameYear(nu, datum) ? 'd MMM' : 'd MMM yyyy';
    return format(datum, dateFormat).replace('.', '');
}
