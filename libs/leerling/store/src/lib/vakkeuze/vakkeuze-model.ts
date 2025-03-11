import { isPresent } from 'harmony';
import { RVak, RVakkeuze } from 'leerling-codegen';
import { orderBy } from 'lodash-es';
import { DEFAULT_STRING, SEntiteit, getEntiteitId } from '../util/entiteit-model';

export interface SVakkeuzeModel {
    vakkeuzes: SVakkeuze[] | undefined;
}

export interface SVakkeuze extends SEntiteit {
    vak: SVak;
    vrijstelling: boolean;
    leerlingUuid: string;
    lichtingUuid: string;
}

export interface SVak extends SEntiteit {
    afkorting: string;
    naam: string;
    uuid: string;
}

export function createVakkeuzeModel(vakkeuzes: RVakkeuze[]): SVakkeuzeModel {
    return {
        vakkeuzes: orderBy(vakkeuzes.map(mapVakkeuze).filter(isPresent), [(vakkeuze: SVakkeuze) => vakkeuze.vak.naam.toLowerCase()])
    };
}

export function mapVakkeuze(vakkeuze: RVakkeuze): SVakkeuze | undefined {
    if (!vakkeuze.leerling?.UUID || !vakkeuze.vak) return undefined;
    return {
        id: getEntiteitId(vakkeuze),
        vak: mapVak(vakkeuze.vak),
        vrijstelling: Boolean(vakkeuze.vrijstelling),
        leerlingUuid: vakkeuze.leerling.UUID,
        lichtingUuid: vakkeuze.relevanteCijferLichting?.UUID ?? DEFAULT_STRING
    };
}

export function mapOptionalVak(vak: RVak | undefined): SVak | undefined {
    return vak ? mapVak(vak) : undefined;
}

export function mapVak(vak: RVak): SVak {
    return {
        id: getEntiteitId(vak),
        afkorting: vak.afkorting ?? '-',
        naam: vak.naam ?? DEFAULT_STRING,
        uuid: vak.UUID ?? DEFAULT_STRING
    };
}
