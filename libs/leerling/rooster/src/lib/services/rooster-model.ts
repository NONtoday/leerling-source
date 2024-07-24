import { Time } from '@angular/common';
import {
    differenceInCalendarDays,
    differenceInMinutes,
    endOfDay,
    format,
    getHours,
    getMinutes,
    isAfter,
    isBefore,
    isEqual,
    isWithinInterval,
    startOfDay
} from 'date-fns';
import { isPresent } from 'harmony';
import { formatDateNL } from 'leerling-util';
import { SAfspraakActie, SAfspraakDag, SAfspraakItem, SKWTInfo, SMaatregelToekenning, SSWIDag, SStudiewijzerItem } from 'leerling/store';

const nu = new Date();
const INSCHRIJVEN_NIET_MOGELIJK = 'Inschrijven niet meer mogelijk';

export type KWTStatus = 'Ingeschreven' | 'Open' | 'Disabled';
export interface KWTInfo {
    status: KWTStatus;
    keuzeTitel: string;
    ondertitel?: string;
    uitschrijfActie?: SAfspraakActie;
}

export interface RoosterItem {
    uniqueIdentifier: string;
    beginDatumTijd: Date;
    eindDatumTijd: Date;
    begintijd: Time;
    duurInMinuten: number;
    lestijd: string;
    omschrijving: string;
    afkorting?: string;
    locatie: string;
    isLes: boolean;
    isToets: boolean;
    isKWT: boolean;
    kwtInfo?: KWTInfo;
    studiewijzerItems: SStudiewijzerItem[];
    afspraakItem: SAfspraakItem;
}

export interface RoosterDag {
    datum: Date;
    dagitems: SStudiewijzerItem[];
    afspraken: RoosterItem[];
    maatregelen: SMaatregelToekenning[];
}

export interface RoosterViewModel {
    weekitems: SStudiewijzerItem[];
    dagen: RoosterDag[];
}

export function getRooster(
    beginDatum: Date,
    eindDatum: Date,
    afspraken: SAfspraakDag[],
    huiswerkItems: SSWIDag[],
    maatregelen: SMaatregelToekenning[],
    weekitems: SStudiewijzerItem[],
    toonLesuren: boolean
): RoosterViewModel {
    return {
        weekitems: weekitems,
        dagen: stelRoosterSamen(beginDatum, eindDatum, afspraken, huiswerkItems, maatregelen, toonLesuren)
    };
}

function stelRoosterSamen(
    beginDatum: Date,
    eindDatum: Date,
    afspraken: SAfspraakDag[],
    huiswerkItems: SSWIDag[],
    maatregelen: SMaatregelToekenning[],
    toonLesuren: boolean
): RoosterDag[] {
    const rooster: RoosterDag[] = [];
    const differenceCalenderDays = differenceInCalendarDays(eindDatum, beginDatum);
    let selectedDate = new Date(beginDatum.getFullYear(), beginDatum.getMonth(), beginDatum.getDate());

    for (let i = 0; i <= differenceCalenderDays; i++) {
        rooster.push(getRoosterDag(selectedDate, afspraken, huiswerkItems, maatregelen, toonLesuren));
        selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
    }
    return rooster;
}

function createRoosterItem(afspraakItem: SAfspraakItem, toonLesuren: boolean): RoosterItem {
    return {
        uniqueIdentifier: afspraakItem.uniqueIdentifier,
        omschrijving: afspraakItem.vak?.naam ?? afspraakItem.titel ?? '',
        afkorting: afspraakItem.vak?.afkorting,
        locatie: afspraakItem.locatie ?? '',
        lestijd: bepaalLestijd(afspraakItem, toonLesuren),
        begintijd: { hours: getHours(afspraakItem.beginDatumTijd), minutes: getMinutes(afspraakItem.beginDatumTijd) },
        duurInMinuten: differenceInMinutes(afspraakItem.eindDatumTijd, afspraakItem.beginDatumTijd),
        beginDatumTijd: afspraakItem.beginDatumTijd,
        eindDatumTijd: afspraakItem.eindDatumTijd,
        isLes: afspraakItem.afspraakItemType === 'ROOSTER' || afspraakItem.afspraakItemType === 'ROOSTERTOETS',
        isToets: afspraakItem.afspraakItemType === 'ROOSTERTOETS',
        isKWT: afspraakItem.isKWT,
        kwtInfo: mapKwtInfo(afspraakItem),
        afspraakItem: afspraakItem,
        // studiewijzeritems worden later gematcht.
        studiewijzerItems: []
    };
}

function bepaalLestijd(afspraakItem: SAfspraakItem, toonLesuren: boolean): string {
    const beginLesuur = afspraakItem.beginLesuur;
    const eindLesuur = afspraakItem.eindLesuur;

    if (!toonLesuren || !beginLesuur || !eindLesuur) {
        return format(afspraakItem.beginDatumTijd, 'H:mm');
    }

    if (beginLesuur === eindLesuur) {
        return beginLesuur + 'e';
    } else {
        return beginLesuur + 'e ' + eindLesuur + 'e';
    }
}

function getRoosterDag(
    datum: Date,
    SAfspraakDagen: SAfspraakDag[],
    huiswerkDagen: SSWIDag[],
    maatregelen: SMaatregelToekenning[],
    toonLesuren: boolean
): RoosterDag {
    const afspraken: RoosterItem[] =
        SAfspraakDagen.find((dag) => isWithinInterval(datum, { start: startOfDay(dag.datum), end: endOfDay(dag.datum) }))?.items.map(
            (afspraak) => createRoosterItem(afspraak, toonLesuren)
        ) ?? [];

    const dagMaatregelen: SMaatregelToekenning[] =
        maatregelen.filter((maatregel) =>
            isWithinInterval(datum, { start: startOfDay(maatregel.maatregelDatum), end: endOfDay(maatregel.maatregelDatum) })
        ) ?? [];

    const roosterDag: RoosterDag = { datum: datum, afspraken: afspraken, dagitems: [], maatregelen: dagMaatregelen };
    return fillHuiswerk(roosterDag, huiswerkDagen);
}

/**
 * Vult de afspraken aan met de huiswerkitems.
 * Als er meerdere afspraken matchen op hetzelfde huiswerkitem, pak dan degene waar het vak het best bij matcht.
 */
function fillHuiswerk(roosterDag: RoosterDag, huiswerkDagen: SSWIDag[]): RoosterDag {
    if (huiswerkDagen.length === 0) return roosterDag;

    const huiswerkDagItems = huiswerkDagen.find((dag) => roosterDag.datum.getTime() === dag.datum.getTime())?.items ?? [];
    if (roosterDag.afspraken.length === 0) {
        // Geen afspraken? Dan is alles een dagitem.
        roosterDag.dagitems = huiswerkDagItems.map((dagItem) => dagItem);
        return roosterDag;
    }

    const swiDagItems: SStudiewijzerItem[] = [];
    huiswerkDagItems.forEach((huiswerkItem) => {
        const afspraak = findAfspraakBijHuiswerk(roosterDag.afspraken, huiswerkItem);
        if (afspraak) {
            afspraak.studiewijzerItems.push(huiswerkItem);
            if (huiswerkItem.huiswerkType === 'TOETS' || huiswerkItem.huiswerkType === 'GROTE_TOETS') {
                // Update isToets als er een toets of grote toets bij de afspraak hoort
                afspraak.isToets = true;
            }
        } else if (huiswerkItem.huiswerkType !== 'LESSTOF') {
            swiDagItems.push(huiswerkItem);
        }
    });

    roosterDag.dagitems = swiDagItems;
    return roosterDag;
}

function findAfspraakBijHuiswerk(afspraken: RoosterItem[], huiswerkItem: SStudiewijzerItem): RoosterItem | undefined {
    // Alleen afspraaktoekenningen koppelen we aan een afspraak.
    if (huiswerkItem.swiToekenningType !== 'AFSPRAAK') return undefined;

    const afsprakenMetZelfdeBegintijd = afspraken.filter(
        (afspraak) => huiswerkItem.datumTijd?.getTime() === afspraak.beginDatumTijd.getTime()
    );
    let matchendeAfspraak = getEerstMatchendeAfspraakLesgroepOfVak(afsprakenMetZelfdeBegintijd, huiswerkItem);
    if (matchendeAfspraak) return matchendeAfspraak;

    const afsprakenInInterval = afspraken.filter((afspraak) =>
        isWithinInterval(huiswerkItem.datumTijd, { start: afspraak.afspraakItem.beginDatumTijd, end: afspraak.afspraakItem.eindDatumTijd })
    );
    matchendeAfspraak = getEerstMatchendeAfspraakLesgroepOfVak(afsprakenInInterval, huiswerkItem);
    if (matchendeAfspraak) return matchendeAfspraak;

    // Niets match op lesgroep/vak en tijd. Is er uberhaubt iets vandaag voor de lesgroep en vak?
    matchendeAfspraak = getEerstMatchendeAfspraakLesgroepOfVak(afspraken, huiswerkItem);
    if (matchendeAfspraak) return matchendeAfspraak;

    // Geen match enkele match op lesgroep/vak. Is er iets wat precies op tijd begint?
    if (afsprakenMetZelfdeBegintijd.length > 0) return afsprakenMetZelfdeBegintijd[0];

    // totaal geen match.
    return undefined;
}

function getEerstMatchendeAfspraakLesgroepOfVak(afspraken: RoosterItem[], huiswerkItem: SStudiewijzerItem): RoosterItem | undefined {
    const sortedAfspraken = afspraken.sort((a, b) => a.beginDatumTijd.getTime() - b.beginDatumTijd.getTime());

    const lesgroepMatch = sortedAfspraken.find((afspraak) => isHuiswerkVoorLesgroep(huiswerkItem, afspraak.afspraakItem));
    if (lesgroepMatch) return lesgroepMatch;

    return sortedAfspraken.find((afspraak) => isHuiswerkVoorAfspraakVak(huiswerkItem, afspraak.afspraakItem));
}

function isHuiswerkVoorLesgroep(studiewijzerItem: SStudiewijzerItem, afspraakItem: SAfspraakItem): boolean {
    if (!studiewijzerItem.lesgroep) return false;

    return afspraakItem.lesgroepIds.includes(studiewijzerItem.lesgroep.id);
}

function isHuiswerkVoorAfspraakVak(studiewijzerItem: SStudiewijzerItem, afspraakItem: SAfspraakItem): boolean {
    const afspraakVak = afspraakItem.vak;

    // Geen vak bij huiswerk en geen vak bij afspraak is ook een match
    if (!studiewijzerItem.vak && !afspraakVak) return true;

    return !!afspraakVak && studiewijzerItem.vak?.id === afspraakVak.id;
}

function mapKwtInfo(afspraakItem: SAfspraakItem): KWTInfo | undefined {
    if (!afspraakItem.kwtInfo) return undefined;

    const skwtInfo = afspraakItem.kwtInfo;
    const isIngeschreven = skwtInfo.inschrijfStatus === 'WEL' || skwtInfo.inschrijfStatus === 'DEFINITIEF';
    const afspraakActies = skwtInfo.afspraakActies;
    const isInschrijvenMogelijk = afspraakActies.some((actie) => actie.toegestaan && !actie.ingeschreven);
    const gekozenKWTItem = afspraakActies.find(
        (actie) =>
            actie.ingeschreven &&
            isEqual(actie.beginDatumTijd, afspraakItem.beginDatumTijd) &&
            isEqual(actie.eindDatumTijd, afspraakItem.eindDatumTijd)
    );

    return {
        status: getStatus(skwtInfo, isInschrijvenMogelijk),
        keuzeTitel: isIngeschreven ? gekozenKWTItem?.titel ?? '' : getKeuzetitel(afspraakActies),
        ondertitel: isIngeschreven ? undefined : getOndertitel(afspraakActies),
        uitschrijfActie: gekozenKWTItem
    };
}

function getStatus(skwtInfo: SKWTInfo, isInschrijvenMogelijk: boolean): KWTStatus {
    let status: KWTStatus | undefined;

    if (skwtInfo.inschrijfStatus === 'WEL' || skwtInfo.inschrijfStatus === 'DEFINITIEF') {
        status = 'Ingeschreven';
    } else {
        isInschrijvenMogelijk ? (status = 'Open') : (status = 'Disabled');
    }
    return status;
}

function getKeuzetitel(afspraakActies: SAfspraakActie[]): string {
    const actiesBinnenInschrijfTermijn = afspraakActies.filter((actie) => isBinnenInschrijfTermijn(actie));

    const openActies = actiesBinnenInschrijfTermijn.filter((actie) => actie.heeftPlek);
    if (openActies.length > 0) return getTitel(openActies, openActies.length > 1);

    if (actiesBinnenInschrijfTermijn.length === 0 || openActies.length === 0) {
        const futureActions = afspraakActies.filter((actie) => isInschrijfDatumInToekomst(actie.inschrijfBeginDatum));
        const pastActions = afspraakActies.filter((actie) => isInschrijfDatumInVerleden(actie.inschrijfEindDatum));

        if (futureActions.length > 1 || pastActions.length > 1) {
            return getTitel(futureActions.length > 1 ? futureActions : pastActions, true);
        } else if (futureActions.length === 1 || pastActions.length === 1) {
            return getTitel(futureActions.length === 1 ? futureActions : pastActions, false);
        }
    }

    return getTitel(actiesBinnenInschrijfTermijn, actiesBinnenInschrijfTermijn.length === 1 ? false : true);
}

function zijnAlleKeuzesVol(afspraakActies: SAfspraakActie[]): boolean {
    return afspraakActies.filter((actie) => !actie.ingeschreven).every((actie) => actie.beschikbarePlaatsen === 0);
}

function getOndertitel(afspraakActies: SAfspraakActie[]): string | undefined {
    if (zijnAlleKeuzesVol(afspraakActies)) {
        return INSCHRIJVEN_NIET_MOGELIJK;
    }

    let inschrijfActies = afspraakActies.filter((actie) => !actie.ingeschreven && actie.heeftPlek);
    if (inschrijfActies.length == null) return undefined;

    inschrijfActies = inschrijfActies.filter((actie) => !isInschrijfDatumInVerleden(actie.inschrijfEindDatum ?? actie.beginDatumTijd));
    if (inschrijfActies.length === 0) {
        return INSCHRIJVEN_NIET_MOGELIJK;
    }

    const inschrijfBeginDatums = inschrijfActies.map((actie) => actie.inschrijfBeginDatum).filter(isPresent);
    if (inschrijfBeginDatums.length === 0) return undefined;

    const eersteInschrijfdatum = inschrijfBeginDatums.reduce((prevDatum, curDatum) => (curDatum < prevDatum ? curDatum : prevDatum));
    if (isInschrijfDatumInToekomst(eersteInschrijfdatum)) {
        return `Inschrijven vanaf ${formatDateNL(eersteInschrijfdatum, 'dagnummer_maand_lang_tijd_lowercase')}`;
    }

    const eerstkomendeEinddatum = inschrijfActies
        .map((actie) => actie.inschrijfEindDatum)
        .filter(isPresent)
        .filter((datum) => isBefore(nu, datum))
        .reduce((acc, current) => (current < acc ? current : acc));
    return `Inschrijving sluit ${formatDateNL(eerstkomendeEinddatum, 'dagnummer_maand_lang_tijd_lowercase')}`;
}

function isBinnenInschrijfTermijn(actie: SAfspraakActie): boolean {
    if (!actie.inschrijfBeginDatum || !actie.inschrijfEindDatum) return true;
    return isWithinInterval(nu, { start: actie.inschrijfBeginDatum, end: actie.inschrijfEindDatum });
}

function isInschrijfDatumInToekomst(datum?: Date): boolean {
    return datum ? isBefore(nu, datum) : false;
}

function isInschrijfDatumInVerleden(datum?: Date): boolean {
    return datum ? isAfter(nu, datum) : false;
}

function getTitel(afspraakActies: SAfspraakActie[], plural: boolean): string {
    return plural ? `${afspraakActies.length} opties` : afspraakActies[0]?.titel;
}
