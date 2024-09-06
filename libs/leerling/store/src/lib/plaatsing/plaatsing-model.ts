// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
import { parseISO } from 'date-fns';
import { isPresent } from 'harmony';
import { RLeerlingSchoolgegevens, RPlaatsing, RVestiging } from 'leerling-codegen';
import { orderBy } from 'lodash-es';
import { assertIsDefined } from '../util/asserts';
import { SEntiteit, getEntiteitId } from '../util/entiteit-model';

export function createPlaatsingModel(plaatsingen: RPlaatsing[], currentState: SPlaatsingModel): SPlaatsingModel {
    return {
        plaatsingen: orderBy(plaatsingen.map(mapPlaatsing).filter(isPresent), 'vanafDatum', 'desc'),
        schoolgegevens: currentState.schoolgegevens
    };
}

export function mapPlaatsing(plaatsing: RPlaatsing): SPlaatsing | undefined {
    if (!plaatsing.UUID || !plaatsing.vanafDatum || !plaatsing.totDatum || !plaatsing.leerling) return undefined;
    return {
        id: getEntiteitId(plaatsing),
        UUID: plaatsing.UUID,
        vanafDatum: parseISO(plaatsing.vanafDatum),
        totDatum: parseISO(plaatsing.totDatum),
        huidig: Boolean(plaatsing.huidig),
        leerling: getEntiteitId(plaatsing.leerling),
        stamgroepnaam: plaatsing.stamgroepnaam,
        opleidingsnaam: plaatsing.opleidingsnaam,
        leerjaar: plaatsing.leerjaar,
        schooljaarnaam: plaatsing.schooljaar?.naam,
        vestiging: plaatsing.vestiging ? mapVestiging(plaatsing.vestiging) : undefined
    };
}

export function mapRVestiging(vestiging: SVestiging): RVestiging {
    return {
        naam: vestiging.naam,
        uuid: vestiging.uuid
    };
}

export function mapVestiging(vestiging: RVestiging): SVestiging {
    assertIsDefined(vestiging.naam);
    assertIsDefined(vestiging.uuid);
    return {
        id: getEntiteitId(vestiging),
        naam: vestiging.naam,
        uuid: vestiging.uuid
    };
}

export function mapSchoolgegevens(schoolgegevens: RLeerlingSchoolgegevens): SLeerlingSchoolgegevens {
    return {
        email: schoolgegevens.email,
        instellingsnaam: schoolgegevens.instellingsnaam,
        leerjaar: schoolgegevens.leerjaar,
        loopbaan: schoolgegevens.loopbaan,
        mentoren: schoolgegevens.mentoren,
        plaats: schoolgegevens.plaats,
        postcode: schoolgegevens.postcode,
        stamgroepnaam: schoolgegevens.stamgroepnaam,
        straat: schoolgegevens.straat,
        telefoonnummer: schoolgegevens.telefoonnummer,
        huidigeVestiging: schoolgegevens.huidigeVestiging ? mapVestiging(schoolgegevens.huidigeVestiging) : undefined
    };
}

export interface SPlaatsingModel {
    plaatsingen: SPlaatsing[] | undefined;
    schoolgegevens: SLeerlingSchoolgegevens | undefined;
}

export interface SPlaatsing extends SEntiteit {
    UUID: string;
    vanafDatum: Date;
    totDatum: Date;
    leerling: number;
    huidig: boolean;
    stamgroepnaam: string | undefined;
    opleidingsnaam: string | undefined;
    leerjaar: number | undefined;
    schooljaarnaam: string | undefined;
    vestiging: SVestiging | undefined;
}

export interface SVestiging extends SEntiteit {
    naam: string;
    uuid: string;
}

export interface SLeerlingSchoolgegevens {
    email: string | undefined;
    instellingsnaam: string | undefined;
    leerjaar: number | undefined;
    loopbaan: string | undefined;
    mentoren: Array<string> | undefined;
    plaats: string | undefined;
    postcode: string | undefined;
    stamgroepnaam: string | undefined;
    straat: string | undefined;
    telefoonnummer: string | undefined;
    huidigeVestiging: SVestiging | undefined;
}
