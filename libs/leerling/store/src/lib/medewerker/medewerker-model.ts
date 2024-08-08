import { isPresent } from 'harmony';
import { RMedewerker, RMedewerkerPrimer } from 'leerling-codegen';
import * as removeAccents from 'remove-accents';
import { match } from 'ts-pattern';
import { ADDITIONAL_VAKKEN_DOCENT_VOOR_LEERLING } from '../bericht/bericht-model';
import { SEntiteit, createLinks, getEntiteitId } from '../util/entiteit-model';
import { SVak, mapVak } from '../vakkeuze/vakkeuze-model';

export function mapMedewerker(medewerker: RMedewerker): SMedewerker {
    const afkortingZonderPunten = medewerker.voorletters?.split('.').join('');
    return {
        id: getEntiteitId(medewerker),
        afkorting: medewerker.afkorting,
        achternaam: medewerker.achternaam,
        geslacht: medewerker.geslacht ?? 'ONBEKEND',
        voorvoegsel: medewerker.voorvoegsel,
        voorletters: medewerker.voorletters,
        roepnaam: medewerker.roepnaam,
        vakken: medewerker.additionalObjects?.[ADDITIONAL_VAKKEN_DOCENT_VOOR_LEERLING]?.items.map(mapVak) ?? [],
        zoekNaam: removeAccents
            .remove(
                [getAanhef(medewerker.geslacht ?? 'ONBEKEND'), afkortingZonderPunten, medewerker.achternaam, medewerker.afkorting]
                    .filter(isPresent)
                    .join(' ')
            )
            .toLowerCase()
    };
}

function getAanhef(geslacht: GESLACHT): string {
    return match(geslacht)
        .with('MAN', () => 'dhr')
        .with('VROUW', () => 'mevr')
        .with('ONBEKEND', () => '')
        .exhaustive();
}

export function mapRMedewerkerPrimer(id: number): RMedewerkerPrimer {
    return {
        links: createLinks(id, 'medewerker.RMedewerkerPrimer')
    };
}

export type GESLACHT = 'MAN' | 'VROUW' | 'ONBEKEND';

export interface SMedewerker extends SEntiteit {
    afkorting?: string;
    achternaam?: string;
    geslacht: GESLACHT;
    voorvoegsel?: string;
    voorletters?: string;
    roepnaam?: string;
    vakken: SVak[];
    zoekNaam?: string;
}
