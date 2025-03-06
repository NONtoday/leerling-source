import { parseISO } from 'date-fns';
import { Link, RAbsentieMelding, RAbsentieMeldingInvoer, RAbsentieReden, RAbsentieRedenPrimer, RLeerlingPrimer } from 'leerling-codegen';
import { SMedewerker, mapMedewerker } from '../medewerker/medewerker-model';
import { SVestiging, mapRVestiging, mapVestiging } from '../plaatsing/plaatsing-model';
import { assertIsDefined } from '../util/asserts';
import { SEntiteit, getEntiteitId } from '../util/entiteit-model';
import { SVerzorger, mapVerzorger } from '../verzorger/verzorger-model';

function mapLeerling(leerling: RLeerlingPrimer): SLeerlingPrimer {
    assertIsDefined(leerling.leerlingnummer);
    return {
        leerlingnummer: leerling.leerlingnummer.toString()
    };
}

export function mapAbsentieMelding(melding: RAbsentieMelding): SAbsentieMelding {
    assertIsDefined(melding.leerling);
    assertIsDefined(melding.absentieReden);
    assertIsDefined(melding.datumTijdInvoer);
    assertIsDefined(melding.beginDatumTijd);
    return {
        id: getEntiteitId(melding),
        leerling: mapLeerling(melding.leerling),
        opmerkingen: melding.opmerkingen,
        eigenaarMedewerker: melding.eigenaarMedewerker ? mapMedewerker(melding.eigenaarMedewerker) : undefined,
        eigenaarVerzorger: melding.eigenaarVerzorger ? mapVerzorger(melding.eigenaarVerzorger) : undefined,
        absentieReden: mapAbsentieReden(melding.absentieReden),
        datumTijdInvoer: parseISO(melding.datumTijdInvoer),
        beginDatumTijd: parseISO(melding.beginDatumTijd),
        eindDatumTijd: melding.eindDatumTijd ? parseISO(melding.eindDatumTijd) : undefined
    };
}

export function mapAbsentieReden(reden: RAbsentieReden): SAbsentieReden {
    assertIsDefined(reden.absentieSoort);
    assertIsDefined(reden.vestiging);
    return {
        id: getEntiteitId(reden),
        absentieSoort: reden.absentieSoort,
        afkorting: reden.afkorting ?? '',
        omschrijving: reden.omschrijving ?? '',
        geoorloofd: Boolean(reden.geoorloofd),
        kiesbaarDoorVerzorger: Boolean(reden.kiesbaarDoorVerzorger),
        verzorgerMagTijdstipKiezen: Boolean(reden.verzorgerMagTijdstipKiezen),
        verzorgerEinddatumVerplicht: Boolean(reden.verzorgerEinddatumVerplicht),
        standaardAfgehandeld: Boolean(reden.standaardAfgehandeld),
        vestiging: mapVestiging(reden.vestiging)
    };
}

export function mapRAbstentieMeldingInvoer(melding: SAbsentieMeldingInvoer, leerlingId: number): RAbsentieMeldingInvoer {
    const invoer: RAbsentieMeldingInvoer = {
        leerling: mapRLeerlingPrimer(melding.leerling.leerlingnummer, leerlingId),
        absentieReden: mapRAbsentieRedenPrimer(melding.absentieReden, melding.absentieReden.id),
        datumTijdInvoer: melding.datumTijdInvoer.toISOString(),
        beginDatumTijd: melding.beginDatumTijd.toISOString(),
        opmerkingen: melding.opmerkingen,
        isHeleDagBeginDatum: melding.isHeleDagBeginDatum
    };

    if (melding.eindDatumTijd) {
        invoer.eindDatumTijd = melding.eindDatumTijd.toISOString();
        invoer.isHeleDagEindDatum = melding.isHeleDagEindDatum;
    }

    return invoer;
}

function mapRLeerlingPrimer(leerlingnummer: string, leerlingId: number): RLeerlingPrimer {
    return {
        leerlingnummer: parseInt(leerlingnummer),
        links: createLinks(leerlingId, 'self', 'leerling.RLeerling')
    };
}

function createLinks(id: number, rel: string, type: string): Link[] {
    return [
        {
            id: id,
            rel: rel,
            type: type
        } as Link
    ];
}

export function mapRAbsentieRedenPrimer(absentieReden: SAbsentieReden, absentieRedenId: number): RAbsentieRedenPrimer {
    return {
        absentieSoort: absentieReden.absentieSoort,
        afkorting: absentieReden.afkorting,
        geoorloofd: absentieReden.geoorloofd,
        kiesbaarDoorVerzorger: absentieReden.kiesbaarDoorVerzorger,
        omschrijving: absentieReden.omschrijving,
        standaardAfgehandeld: absentieReden.standaardAfgehandeld,
        verzorgerEinddatumVerplicht: absentieReden.verzorgerEinddatumVerplicht,
        verzorgerMagTijdstipKiezen: absentieReden.verzorgerMagTijdstipKiezen,
        vestiging: mapRVestiging(absentieReden.vestiging),
        links: createLinks(absentieRedenId, 'self', 'participatie.RAbsentieReden')
    };
}

export interface SAbsentieState {
    absentieRedenen: SAbsentieReden[] | undefined;
}

export interface SAbsentieMelding extends SAbsentieMeldingPrimer, SEntiteit {
    opmerkingen: string | undefined;
    eigenaarMedewerker: SMedewerker | undefined;
    eigenaarVerzorger: SVerzorger | undefined;
}

export interface SAbsentieReden extends SEntiteit {
    absentieSoort: SAbsentieSoort;
    afkorting: string;
    omschrijving: string;
    geoorloofd: boolean;
    kiesbaarDoorVerzorger: boolean;
    verzorgerMagTijdstipKiezen: boolean;
    verzorgerEinddatumVerplicht: boolean;
    standaardAfgehandeld: boolean;
    vestiging: SVestiging;
}

export type SAbsentieSoort = 'Absent' | 'Telaat' | 'Verwijderd';

export interface SAbsentieMeldingInvoer extends SAbsentieMeldingPrimer {
    isHeleDagBeginDatum?: boolean;
    isHeleDagEindDatum?: boolean;
    opmerkingen?: string;
}

interface SLeerlingPrimer {
    leerlingnummer: string;
}

export interface SAbsentieMeldingPrimer {
    leerling: SLeerlingPrimer;
    absentieReden: SAbsentieReden;
    datumTijdInvoer: Date;
    beginDatumTijd: Date;
    eindDatumTijd?: Date;
}
