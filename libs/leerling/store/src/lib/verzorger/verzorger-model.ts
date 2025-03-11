import { RAdres, RVerzorger } from 'leerling-codegen';
import { GESLACHT } from '../medewerker/medewerker-model';
import { assertIsDefined } from '../util/asserts';
import { SEntiteit, getEntiteitId } from '../util/entiteit-model';

export function mapVerzorger(verzorger: RVerzorger): SVerzorger {
    assertIsDefined(verzorger.adres);
    return {
        id: getEntiteitId(verzorger),
        voorletters: verzorger.voorletters,
        voorvoegsel: verzorger.voorvoegsel,
        achternaam: verzorger.achternaam,
        mobielNummer: verzorger.mobielNummer,
        mobielWerkNummer: verzorger.mobielWerkNummer,
        email: verzorger.email,
        adres: mapAdres(verzorger.adres),
        geslacht: verzorger.geslacht ?? 'ONBEKEND'
    };
}

export function mapAdres(adres: RAdres): SAdres {
    return {
        id: getEntiteitId(adres),
        straat: adres.straat,
        huisnummer: adres.huisnummer,
        plaatsnaam: adres.plaatsnaam,
        postcode: adres.postcode,
        telefoonnummer: adres.telefoonnummer,
        isBuitenlandsAdres: Boolean(adres.isBuitenlandsAdres),
        land: adres.land,
        buitenland1: adres.buitenland1,
        buitenland2: adres.buitenland2,
        buitenland3: adres.buitenland3
    };
}

export interface SVerzorger extends SEntiteit {
    voorletters?: string;
    voorvoegsel?: string;
    achternaam?: string;
    mobielNummer?: string;
    mobielWerkNummer?: string;
    email?: string;
    adres: SAdres;
    geslacht: GESLACHT;
}

export interface SAdres extends SEntiteit {
    straat?: string;
    huisnummer?: string;
    plaatsnaam?: string;
    postcode?: string;
    telefoonnummer?: string;
    isBuitenlandsAdres: boolean;
    land?: string;
    buitenland1?: string;
    buitenland2?: string;
    buitenland3?: string;
}
