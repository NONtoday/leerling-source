import { RMedewerker, RMedewerkerPrimer } from 'leerling-codegen';
import { ADDITIONAL_VAKKEN_DOCENT_VOOR_LEERLING } from '../bericht/bericht-model';
import { SEntiteit, createLinks, getEntiteitId } from '../util/entiteit-model';
import { SVak, mapVak } from '../vakkeuze/vakkeuze-model';

export function mapMedewerker(medewerker: RMedewerker): SMedewerker {
    return {
        id: getEntiteitId(medewerker),
        afkorting: medewerker.afkorting,
        achternaam: medewerker.achternaam,
        geslacht: medewerker.geslacht ?? 'ONBEKEND',
        voorvoegsel: medewerker.voorvoegsel,
        voorletters: medewerker.voorletters,
        roepnaam: medewerker.roepnaam,
        vakken: medewerker.additionalObjects?.[ADDITIONAL_VAKKEN_DOCENT_VOOR_LEERLING]?.items.map(mapVak) ?? []
    };
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
}
