import { parseISO } from 'date-fns';
import { RSchooljaar } from 'leerling-codegen';
import { assertIsDefined } from '../util/asserts';
import { SEntiteit, getEntiteitId } from '../util/entiteit-model';

export function mapSchooljaar(schooljaar: RSchooljaar): SSchooljaar {
    assertIsDefined(schooljaar.naam);
    assertIsDefined(schooljaar.vanafDatum);
    assertIsDefined(schooljaar.totDatum);
    assertIsDefined(schooljaar.isHuidig);
    return {
        id: getEntiteitId(schooljaar),
        naam: schooljaar.naam,
        vanafDatum: parseISO(schooljaar.vanafDatum),
        totDatum: parseISO(schooljaar.totDatum),
        isHuidig: schooljaar.isHuidig
    };
}

export interface SSchooljaarState {
    huidigSchooljaar: SSchooljaar | undefined;
}

export interface SSchooljaar extends SEntiteit {
    naam: string;
    vanafDatum: Date;
    totDatum: Date;
    isHuidig: boolean;
}
