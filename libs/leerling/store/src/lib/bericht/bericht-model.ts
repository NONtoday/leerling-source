import { parseISO } from 'date-fns';
import { isPresent, stripHtml } from 'harmony';
import { RBoodschap, RBoodschapConversatie, RBoodschapCorrespondent, RNieuwBericht, RReactieBericht } from 'leerling-codegen';
import { last } from 'lodash-es';
import { SBijlage } from '../bijlage/bijlage-model';
import { mapBoodschapBijlage } from '../bijlage/bijlage-util';
import { SMedewerker, mapRMedewerkerPrimer } from '../medewerker/medewerker-model';
import { assertIsDefined } from '../util/asserts';
import { DEFAULT_STRING, SEntiteit, createLinks, getEntiteitId } from '../util/entiteit-model';
import { SVak, mapVak } from '../vakkeuze/vakkeuze-model';

export const MAX_AANTAL_INITIAL_ONTVANGERS = 5;

export function mapConversatie(conversatie: RBoodschapConversatie): SConversatie {
    const eersteBericht = last(conversatie.boodschappen);

    assertIsDefined(conversatie.boodschappen);
    assertIsDefined(eersteBericht);

    return {
        id: getEntiteitId(eersteBericht),
        boodschappen: conversatie.boodschappen.map(mapBoodschap),
        datumOudsteOngelezenBoodschap: conversatie.datumOudsteOngelezenBoodschap
            ? parseISO(conversatie.datumOudsteOngelezenBoodschap)
            : undefined
    };
}

function createEmptySBoodschapCorrespondent(): SBoodschapCorrespondent {
    return { naam: 'Somtoday (automatisch)', vakken: [], isSomtodayAutomatischBericht: true };
}

export function mapBoodschap(boodschap: RBoodschap): SBoodschap {
    assertIsDefined(boodschap.verzendDatum);
    assertIsDefined(boodschap.additionalObjects);

    let ontvangerCorrespondentenLimited: SBoodschapCorrespondent[] =
        boodschap.additionalObjects[ADDITIONAL_ONTVANGER_CORRESPONDENTEN]?.items
            .map(mapBoodschapCorrespondent)
            .filter(isPresent)
            .sort((o: SBoodschapCorrespondent) => o.sorteerNaam) ?? [];
    let aantalExtraOntvangers = boodschap.additionalObjects[ADDITIONAL_AANTAL_EXTRA_ONTVANGERS];
    let extraOntvangerCorrespondenten: SBoodschapCorrespondent[] = [];

    if (ontvangerCorrespondentenLimited.length === 0) {
        ontvangerCorrespondentenLimited = [createEmptySBoodschapCorrespondent()];
    }

    // Bij een nieuwe boodschap met meer dan 5 ontvangers, extra ontvangers tonen
    if (ontvangerCorrespondentenLimited.length > MAX_AANTAL_INITIAL_ONTVANGERS) {
        extraOntvangerCorrespondenten = ontvangerCorrespondentenLimited.slice(MAX_AANTAL_INITIAL_ONTVANGERS);
        ontvangerCorrespondentenLimited = ontvangerCorrespondentenLimited.slice(0, MAX_AANTAL_INITIAL_ONTVANGERS);
        aantalExtraOntvangers = extraOntvangerCorrespondenten.length;
    }

    return {
        id: getEntiteitId(boodschap),
        verzendDatum: parseISO(boodschap.verzendDatum),
        wijzigingsDatum: boodschap.wijzigingsDatum ? parseISO(boodschap.wijzigingsDatum) : undefined,
        draft: Boolean(boodschap.draft),
        onderwerp: boodschap.onderwerp ?? '',
        mimeType: boodschap.mimeType,
        inhoud: boodschap.inhoud,
        prioriteit: boodschap.prioriteit,
        notificatieType: boodschap.notificatieType,
        bijlages: boodschap.bijlages?.map(mapBoodschapBijlage).filter(isPresent) ?? [],
        verzondenDoorGebruiker: boodschap.additionalObjects[ADDITIONAL_VERZONDEN_DOOR_GEBRUIKER],
        verzenderCorrespondent: mapBoodschapCorrespondent(boodschap.additionalObjects[ADDITIONAL_VERZENDER_CORRESPONDENT]),
        ontvangerCorrespondenten: ontvangerCorrespondentenLimited,
        aantalExtraOntvangers: aantalExtraOntvangers,
        extraOntvangerCorrespondenten: extraOntvangerCorrespondenten
    };
}

export function mapBoodschapCorrespondent(correspondent: RBoodschapCorrespondent | undefined): SBoodschapCorrespondent {
    if (!correspondent) return createEmptySBoodschapCorrespondent();

    return {
        naam: correspondent.naam ?? DEFAULT_STRING,
        sorteerNaam: correspondent.sorteerNaam,
        initialen: correspondent.initialen ?? DEFAULT_STRING,
        vakken: correspondent.vakken?.map(mapVak).slice(0, 5) ?? []
    };
}

export function getPreviewInhoudBoodschap(text: string | undefined, options?: { addEllipses: boolean }): string {
    let preview = '';
    if (text) {
        preview = stripHtml(text);
    }
    return `${preview.substring(0, 100)}${options?.addEllipses && preview.length > 100 ? '...' : ''}`;
}

export function kanReagerenOpBoodschap(boodschap: SBoodschap) {
    return (
        !boodschap.verzondenDoorGebruiker &&
        !boodschap.verzenderCorrespondent.isSomtodayAutomatischBericht &&
        boodschap.notificatieType !== 'Mededeling'
    );
}

export function mapRBoodschap(id: number): RBoodschap {
    return {
        links: createLinks(id, 'berichten.RBoodschap')
    };
}

export function mapRNieuwBericht(nieuwBerichtInput: NieuwBerichtInput): RNieuwBericht {
    return {
        onderwerp: nieuwBerichtInput.onderwerp,
        inhoud: nieuwBerichtInput.inhoud.replace(/\n/g, '<br>'),
        ontvangers: nieuwBerichtInput.ontvangerIds.map(mapRMedewerkerPrimer)
    };
}

export function mapRReactieBericht(reactieBerichtInput: ReactieBerichtInput): RReactieBericht {
    return {
        inhoud: reactieBerichtInput.inhoud.replace(/\n/g, '<br>'),
        reactieOp: mapRBoodschap(reactieBerichtInput.reactieOpBerichtId)
    };
}

export const ADDITIONAL_VERZONDEN_DOOR_GEBRUIKER = 'verzondenDoorGebruiker';
export const ADDITIONAL_VERZENDER_CORRESPONDENT = 'verzenderCorrespondent';
export const ADDITIONAL_ONTVANGER_CORRESPONDENTEN = 'ontvangerCorrespondenten';
export const ADDITIONAL_VAKKEN_DOCENT_VOOR_LEERLING = 'vakkenDocentVoorLeerling';
export const ADDITIONAL_AANTAL_EXTRA_ONTVANGERS = 'aantalExtraOntvangers';

export interface SBoodschap extends SEntiteit {
    verzendDatum: Date;
    wijzigingsDatum: Date | undefined;
    draft: boolean;
    onderwerp: string;
    mimeType: string | undefined;
    inhoud: string | undefined;
    prioriteit: SBoodschapPrioriteit | undefined;
    notificatieType: SBoodschapNotificatieType | undefined;
    bijlages: SBijlage[];
    verzondenDoorGebruiker: boolean;
    verzenderCorrespondent: SBoodschapCorrespondent;
    ontvangerCorrespondenten: SBoodschapCorrespondent[];
    aantalExtraOntvangers: number;
    extraOntvangerCorrespondenten: SBoodschapCorrespondent[];
}

export interface SBoodschapCorrespondent {
    isSomtodayAutomatischBericht?: boolean;
    naam: string;
    sorteerNaam?: string;
    initialen?: string;
    vakken: SVak[];
}

export type SBoodschapPrioriteit = 'URGENT' | 'HOOG' | 'NORMAAL' | 'LAAG';

export type SBoodschapNotificatieType =
    | 'Handelingsplan'
    | 'Begeleidingsverslag'
    | 'Incident'
    | 'AfspraakVerplaatst'
    | 'AfspraakVerplaatstMetHuiswerk'
    | 'AfspraakGaatNietDoor'
    | 'UitgenodigdOfGeplaatstVoorAfspraak'
    | 'Signaleringslijst'
    | 'ContactMomentVerzonden'
    | 'FlexibeleLvsPagina'
    | 'BudgetIndicatie'
    | 'ZorgMelding'
    | 'Beperking'
    | 'Bericht'
    | 'Mededeling'
    | 'Inlevering'
    | 'Ontwikkelingsperspectief'
    | 'EldDossierAanvraag'
    | 'EldTerugkoppeling';

export interface SBerichtenState {
    conversaties: SConversatie[] | undefined;
    toegestaneOntvangers: SMedewerker[] | undefined;
    alleConversatiesOpgehaald: boolean | undefined;
}

export interface SConversatie {
    id: number;
    boodschappen: SBoodschap[];
    datumOudsteOngelezenBoodschap: Date | undefined;
}

export type Conversatie = PostvakInConversatie | PostvakUitConversatie;

export type PostvakInConversatie = {
    conversatie: SConversatie;
    meestRecenteBericht: SBoodschap;
};

export type PostvakUitConversatie = {
    conversatie: SConversatie;
    meestRecentVerstuurdeBericht: SBoodschap;
    nieuwereBerichten: SBoodschap[];
};

export type RefreshConversatieOptions = {
    alleConversaties?: boolean;
    forceRequest?: true;
};

export interface VerstuurdBerichtInput {
    inhoud: string;
}

export type NieuwBerichtInput = VerstuurdBerichtInput & {
    onderwerp: string;
    ontvangerIds: number[];
};

export type ReactieBerichtInput = VerstuurdBerichtInput & {
    reactieOpBerichtId: number;
};
