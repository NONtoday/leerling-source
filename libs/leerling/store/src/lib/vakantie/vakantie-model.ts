/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { parseISO } from 'date-fns';
import { RVakantie } from 'leerling-codegen';
import { SEntiteit, getEntiteitId } from '../util/entiteit-model';

export interface SVakantieModel {
    vakanties: SVakantie[];
}

export interface SVakantie extends SEntiteit {
    naam: string;
    beginDatum: Date;
    eindDatum: Date;
}

export function createVakantieModel(rVakanties: RVakantie[]): SVakantieModel {
    return {
        vakanties: rVakanties.map((rVakantie) => mapVakantie(rVakantie))
    };
}

function mapVakantie(rVakantie: RVakantie): SVakantie {
    return {
        id: getEntiteitId(rVakantie),
        naam: rVakantie.naam ?? 'vakantie',
        beginDatum: parseISO(rVakantie.beginDatum!),
        eindDatum: parseISO(rVakantie.eindDatum!)
    };
}
