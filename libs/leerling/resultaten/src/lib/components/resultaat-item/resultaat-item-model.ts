import { DossierType, Herkansingssoort, Toetstype } from 'leerling/store';
import { Poging } from '../../services/laatsteresultaten/laatsteresultaten-model';
import { PogingData } from '../../services/vakresultaten/vakresultaten-model';

export type IsVoldoendeType = 'voldoende' | 'onvoldoende' | 'neutraal';

export type TeltNietMeeType = 'Deze herkansing telt niet mee' | 'Deze poging telt niet mee' | 'Dit cijfer telt niet mee';

export interface GeldendePoging {
    poging: Poging;
    resultaat: string;
    isOnvoldoende: boolean;
}

export interface ResultaatGeldend {
    poging: Poging;
    resultaat: string;
    isOnvoldoende: boolean;
    herkansingssoort: Herkansingssoort;
}

export interface ResultaatItemDetails {
    opmerking?: string;
    weging: string;
    afwijkendeWegingExamen?: string;
    herkansingSoortOmschrijving?: string;
    toetssoort: string;
    resultaatkolomId: number;
    dossierType: DossierType;
    heeftHerkansing: boolean;
    pogingen?: PogingData[];
    geldend?: ResultaatGeldend;
    isAlternatief?: boolean;
}

export interface ResultaatItem {
    titel: string;
    titelPostfix?: string;
    subtitel?: string;
    resultaat: string;
    isLeegResultaat: boolean;
    isVoldoende: IsVoldoendeType;
    toetstype: Toetstype;
    heeftOpmerking: boolean;
    isHerkansing: boolean;
    teltNietMee?: TeltNietMeeType;
    details?: ResultaatItemDetails;
    weging?: string; // de weging zoals getoond in het overzicht.
    pogingTooltipOmschrijving?: string;
}

/**
 * Geen weging ==> neutraal (ongeacht het cijfer)
 * Herkansing/Poging die niet het hoogste is ==> neutraal (ongeacht het cijfer)
 */
export function formatIsVoldoende(weging: number, teltPoging: boolean, isVoldoende?: boolean): IsVoldoendeType {
    if (weging === 0) return 'neutraal';

    if (!teltPoging) return 'neutraal';

    if (isVoldoende === true) return 'voldoende';
    else if (isVoldoende === false) return 'onvoldoende';
    else return 'neutraal';
}

export function getHerkansingssoortOmschrijving(herkansingssoort: Herkansingssoort, herkansing?: Poging): string | undefined {
    if (herkansing === undefined || herkansing === 0) return undefined;

    switch (herkansingssoort) {
        case 'EenKeerHoogste':
        case 'TweeKeerHoogste':
            return herkansing + 'e herkansing, hoogste telt';
        case 'EenKeerLaatste':
        case 'TweeKeerLaatste':
            return herkansing + 'e herkansing, laatste telt';
        case 'EenkeerGemiddeld':
        case 'TweeKeerGemiddeld':
            return herkansing + 'e herkansing, gemiddelde telt';
        default:
            return undefined;
    }
}

export function getPogingTooltipOmschrijving(herkansingssoort: Herkansingssoort, pogingen: PogingData[]): string | undefined {
    if (pogingen.length === 0) return undefined;

    switch (herkansingssoort) {
        case 'EenKeerHoogste':
        case 'TweeKeerHoogste': {
            const poging = pogingen.reduce(
                (hoogste: PogingData, poging: PogingData) =>
                    !hoogste || parseFloat(poging.resultaat) >= parseFloat(hoogste.resultaat) ? poging : hoogste,
                null
            );
            return getPogingOmschrijving(poging);
        }
        case 'EenKeerLaatste':
        case 'TweeKeerLaatste':
            // het laastste resultaat is altijd de eerste poging.
            return getPogingOmschrijving(pogingen[0]);
        case 'EenkeerGemiddeld':
        case 'TweeKeerGemiddeld':
            return 'Cijfer is een gemiddelde';
        default:
            return undefined;
    }
}

function getPogingOmschrijving(poging: PogingData | null): string {
    return poging?.omschrijving.toLowerCase().includes('eerste poging') ? 'Cijfer is eerste poging' : 'Cijfer is een herkansing';
}

// t.b.v. het testen
export function createDummyResultaatItem(): ResultaatItem {
    return {
        titel: 'Nederlands',
        subtitel: 'yesterday... - Omschrijving',
        resultaat: '8.0',
        isLeegResultaat: false,
        isVoldoende: 'voldoende',
        toetstype: 'Toetskolom',
        heeftOpmerking: false,
        isHerkansing: false,
        details: {
            weging: '2x',
            toetssoort: 'proefwerk',
            dossierType: 'Voortgang',
            heeftHerkansing: false,
            pogingen: [],
            resultaatkolomId: 1234,
            opmerking: 'Dit is een opmerking'
        }
    };
}

export function createDummResultaatItemDetails(): ResultaatItemDetails {
    return {
        weging: '1x',
        toetssoort: 'Tussentijdse toets',
        resultaatkolomId: 1,
        dossierType: 'Voortgang',
        heeftHerkansing: false
    };
}
