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
    isVoldoende: IsVoldoendeType;
    toetstype: Toetstype;
    heeftOpmerking: boolean;
    isHerkansing: boolean;
    teltNietMee?: TeltNietMeeType;
    details?: ResultaatItemDetails;
    weging?: string; // de weging zoals getoond in het overzicht.
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

export function getHerkansingssoortOmschrijving(herkansingssoort: Herkansingssoort, herkansing: Poging): string | undefined {
    if (herkansing === 0) return undefined;

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

// t.b.v. het testen
export function createDummyResultaatItem(): ResultaatItem {
    return {
        titel: 'Nederlands',
        subtitel: 'yesterday... - Omschrijving',
        resultaat: '8.0',
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
