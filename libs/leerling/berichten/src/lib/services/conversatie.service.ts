import { isBefore } from 'date-fns';
import { assertIsDefined, SConversatie } from 'leerling/store';
import { match } from 'ts-pattern';
import { BerichtenTabLink } from './../components/berichten/berichten.component';

export const meestRecentRelevanteBericht = (tab: BerichtenTabLink, conversatie: SConversatie) =>
    match(tab)
        .with('postvak-in', () => meestRecentOntvangenBericht(conversatie))
        .with('verzonden-items', () => meestRecentVerstuurdeBericht(conversatie))
        .exhaustive();

export function meestRecentOntvangenBericht(conversatie: SConversatie) {
    const bericht = conversatie.boodschappen.find((boodschap) => !boodschap.verzondenDoorGebruiker);
    assertIsDefined(bericht);
    return bericht;
}

export function meestRecentVerstuurdeBericht(conversatie: SConversatie) {
    const bericht = conversatie.boodschappen.find((boodschap) => boodschap.verzondenDoorGebruiker);
    assertIsDefined(bericht);
    return bericht;
}

export const ongelezenBerichten = (conversatie: SConversatie, ongelezenVanaf: Date | undefined) =>
    ongelezenVanaf
        ? conversatie.boodschappen.slice(0, eersteOngelezenBerichtIndex(conversatie, ongelezenVanaf))
        : conversatie.boodschappen.slice(0, 1);

export const nieuwereBerichten = (conversatie: SConversatie) =>
    conversatie.boodschappen.slice(0, meestRecentVerstuurdeBerichtIndex(conversatie));

const meestRecentVerstuurdeBerichtIndex = (conversatie: SConversatie) =>
    conversatie.boodschappen.findIndex((boodschap) => boodschap.verzondenDoorGebruiker);

const eersteOngelezenBerichtIndex = (conversatie: SConversatie, ongelezenVanaf: Date) =>
    findIndexWithDefault(conversatie.boodschappen, (boodschap) => isBefore(boodschap.verzendDatum, ongelezenVanaf), undefined);
//TODO: verplaatsen naar nx-util lib zodra die er is
function findIndexWithDefault<T>(array: T[], predicate: (item: T) => boolean | undefined, defaultIndex: number | undefined) {
    const foundIndex = array.findIndex(predicate);
    return foundIndex === -1 ? defaultIndex : foundIndex;
}
