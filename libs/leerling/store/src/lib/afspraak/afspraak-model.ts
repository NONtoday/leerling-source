/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { addDays, differenceInCalendarDays, endOfDay, startOfDay } from 'date-fns';
import { isPresent } from 'harmony';
import { RAfspraakActie, RAfspraakItem, RAfspraakVak, RHerhalendeAfspraak, RkwtAfspraakItem } from 'leerling-codegen';
import { range } from 'lodash-es';
import { SBijlage } from '../bijlage/bijlage-model';
import { mapAfspraakBijlage } from '../bijlage/bijlage-util';
import { toLocalDateTime } from '../util/date-util';
import { DEFAULT_STRING, SEntiteit, getEntiteitId, parseOptionalDate } from '../util/entiteit-model';
import { SVak } from '../vakkeuze/vakkeuze-model';

export const NO_VAK_UUID_AVAILABLE = 'NO_VAK_UUID_AVAILABLE';
export type AfspraakCategorie =
    | 'Individueel'
    | 'Rooster'
    | 'Prive'
    | 'Beschermd'
    | 'Externe agenda'
    | 'Ouderavond'
    | 'Examen'
    | 'Toets'
    // Onbekend indien we geen mapping kunnen maken
    | 'Onbekend';

export interface SAfspraakActie {
    titel: string;
    omschrijving?: string;
    toegestaan: boolean;
    beschikbarePlaatsen?: number;
    heeftPlek: boolean;
    locatie?: string;
    docentNamen: string[];
    ingeschreven: boolean;
    inschrijfBeginDatum?: Date;
    inschrijfEindDatum?: Date;
    beginDatumTijd: Date;
    eindDatumTijd: Date;
    uitvoerbareActie: string;
    vak?: SVak;
    herhalendeAfspraak?: SHerhalendeAfspraak;
}

export interface SKWTInfo {
    minimumAantalKeuzes: number;
    maximumAantalKeuzes: number;
    afspraakActies: SAfspraakActie[];
    inschrijfStatus: 'ONBEPAALD' | 'NIET' | 'WEL' | 'DEFINITIEF' | 'VERLOPEN';
    kwtSysteem: 'SOMTODAY' | 'ZERMELO';
}

export type HerhaalDag = 'MAANDAG' | 'DINSDAG' | 'WOENSDAG' | 'DONDERDAG' | 'VRIJDAG' | 'ZATERDAG' | 'ZONDAG' | 'DAG' | 'WERKDAG';

export interface SHerhalendeAfspraak extends SEntiteit {
    beginDatum: Date;
    eindDatum?: Date;
    maxHerhalingen?: number;
    type: 'NIET_HERHALEN' | 'DAGELIJKS' | 'WEKELIJKS' | 'MAANDELIJKS';
    skip: number;
    cyclus: number;
    afspraakHerhalingDagen: HerhaalDag[];
}

export interface SAfspraakItem {
    uniqueIdentifier: string;
    afspraakItemType: 'INDIVIDUEEL' | 'ROOSTER' | 'PRIVE' | 'BESCHERMD' | 'EXTERN' | 'OUDERAVOND' | 'EXAMEN' | 'ROOSTERTOETS' | 'ONBEKEND';
    locatie?: string;
    beginDatumTijd: Date;
    eindDatumTijd: Date;
    beginLesuur?: number;
    eindLesuur?: number;
    titel: string;
    omschrijving?: string;
    vak?: SVak;
    herhalendeAfspraak?: SHerhalendeAfspraak;
    bijlagen: SBijlage[];
    medewerkers: string[];
    // Vanwege data-minimalisatie hebben we aan het id voldoende
    lesgroepIds: number[];
    isKWT: boolean;
    kwtInfo?: SKWTInfo;
    aantalToekomstigeHerhalingen?: number;
}

export interface SAfspraakDag {
    datum: Date;
    items: SAfspraakItem[];
}

export interface SAfspraakWeek {
    jaarWeek: string;
    dagen: SAfspraakDag[];
}

// Alle calls doen we per week.
// Als we een bestaande call opnieuw doen, dan vervangen we hier die week.
export interface SAfspraakModel {
    jaarWeken: SAfspraakWeek[] | undefined;
}
function mapToSAfspraakItem(rAfspraakItem: RAfspraakItem): SAfspraakItem {
    const rLesgroepen = rAfspraakItem.lesgroepen ?? [];
    const isKwt = '$type' in rAfspraakItem && rAfspraakItem.$type === 'participatie.live.RKWTAfspraakItem';

    return {
        uniqueIdentifier: rAfspraakItem.uniqueIdentifier ?? DEFAULT_STRING,
        afspraakItemType: rAfspraakItem.afspraakItemType ?? 'ONBEKEND',
        locatie: rAfspraakItem.locatie,
        beginDatumTijd: toLocalDateTime(rAfspraakItem.beginDatumTijd!),
        eindDatumTijd: toLocalDateTime(rAfspraakItem.eindDatumTijd!),
        beginLesuur: rAfspraakItem.beginLesuur,
        eindLesuur: rAfspraakItem.eindLesuur,
        titel: rAfspraakItem.titel!,
        omschrijving: rAfspraakItem.omschrijving,
        vak: mapAfspraakVak(rAfspraakItem.vak),
        herhalendeAfspraak: mapHerhalendeAfspraak(rAfspraakItem.herhalendeAfspraak),
        bijlagen: rAfspraakItem.bijlagen?.map(mapAfspraakBijlage).filter(isPresent) ?? [],
        lesgroepIds: rLesgroepen.map((lesgroep) => getEntiteitId(lesgroep)),
        medewerkers: rAfspraakItem.docentNamen ?? [],
        isKWT: isKwt,
        kwtInfo: isKwt ? mapKwtInfo(rAfspraakItem as RkwtAfspraakItem) : undefined,
        aantalToekomstigeHerhalingen: rAfspraakItem.aantalToekomstigeHerhalingen
    };
}

function mapHerhalendeAfspraak(rHerhalendeAfspraak: RHerhalendeAfspraak | undefined): SHerhalendeAfspraak | undefined {
    if (!rHerhalendeAfspraak) return undefined;

    return {
        id: getEntiteitId(rHerhalendeAfspraak),
        beginDatum: toLocalDateTime(rHerhalendeAfspraak.beginDatum!),
        eindDatum: parseOptionalDate(rHerhalendeAfspraak.eindDatum),
        maxHerhalingen: rHerhalendeAfspraak.maxHerhalingen ?? 0,
        type: rHerhalendeAfspraak.type || 'NIET_HERHALEN',
        skip: rHerhalendeAfspraak.skip ?? 0,
        cyclus: rHerhalendeAfspraak.cyclus ?? 0,
        afspraakHerhalingDagen: rHerhalendeAfspraak.afspraakHerhalingDagen ?? []
    };
}

function mapKwtInfo(kwt: RkwtAfspraakItem): SKWTInfo {
    return {
        afspraakActies: kwt.afspraakActies?.map((afspraakActie) => mapAfspraakActie(afspraakActie)).filter(isPresent) ?? [],
        inschrijfStatus: kwt.inschrijfStatus ?? 'ONBEPAALD',
        minimumAantalKeuzes: kwt.minimumAantalKeuzes ?? 0,
        maximumAantalKeuzes: kwt.maximumAantalKeuzes ?? 0,
        kwtSysteem: kwt.kwtSysteem ?? 'SOMTODAY'
    };
}

function mapAfspraakActie(rAfspraakActie: RAfspraakActie): SAfspraakActie | undefined {
    if (!rAfspraakActie.uitvoerbareActie) return undefined;

    return {
        titel: rAfspraakActie.titel ?? DEFAULT_STRING,
        omschrijving: rAfspraakActie.omschrijving,
        toegestaan: rAfspraakActie.toegestaan ?? false,
        beschikbarePlaatsen: rAfspraakActie.beschikbarePlaatsen,
        heeftPlek: rAfspraakActie.beschikbarePlaatsen === undefined || rAfspraakActie.beschikbarePlaatsen > 0,
        locatie: rAfspraakActie.locatie,
        docentNamen: rAfspraakActie.docentNamen ?? [],
        ingeschreven: rAfspraakActie.ingeschreven ?? false,
        inschrijfBeginDatum: parseOptionalDate(rAfspraakActie.inschrijfBeginDatum),
        inschrijfEindDatum: parseOptionalDate(rAfspraakActie.inschrijfEindDatum),
        beginDatumTijd: parseOptionalDate(rAfspraakActie.beginDatumTijd) ?? new Date(),
        eindDatumTijd: parseOptionalDate(rAfspraakActie.eindDatumTijd) ?? new Date(),
        uitvoerbareActie: rAfspraakActie.uitvoerbareActie,
        vak: mapAfspraakVak(rAfspraakActie.vak),
        herhalendeAfspraak: mapHerhalendeAfspraak(rAfspraakActie.herhalendeAfspraak)
    };
}

export function mapAfspraakItem(rAfspraakItem: RAfspraakItem): SAfspraakItem[] {
    const beginDatumTijd = toLocalDateTime(rAfspraakItem.beginDatumTijd!);
    const eindDatumTijd = toLocalDateTime(rAfspraakItem.eindDatumTijd!);

    const aantalDagen = differenceInCalendarDays(eindDatumTijd, beginDatumTijd);
    if (aantalDagen === 0) {
        return [mapToSAfspraakItem(rAfspraakItem)];
    }

    return range(0, aantalDagen + 1).map((index) => {
        const afspraakItem = mapToSAfspraakItem(rAfspraakItem);
        if (index === 0) {
            afspraakItem.eindDatumTijd = endOfDay(afspraakItem.beginDatumTijd);
        } else {
            const dag = addDays(afspraakItem.beginDatumTijd, index);
            afspraakItem.beginDatumTijd = startOfDay(dag);
            if (index !== aantalDagen) {
                afspraakItem.eindDatumTijd = endOfDay(dag);
            }
        }
        return afspraakItem;
    });
}

function mapAfspraakVak(rAfspraakVak?: RAfspraakVak): SVak | undefined {
    if (!rAfspraakVak) return undefined;
    return {
        id: rAfspraakVak.id ?? -1,
        afkorting: rAfspraakVak.afkorting ?? '',
        naam: rAfspraakVak.naam ?? DEFAULT_STRING,
        uuid: rAfspraakVak.UUID ?? NO_VAK_UUID_AVAILABLE
    };
}
