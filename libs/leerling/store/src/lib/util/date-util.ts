import {
    addWeeks,
    endOfWeek,
    format,
    getISOWeek,
    getWeekYear,
    isBefore,
    isDate,
    isFriday,
    isMonday,
    nextFriday,
    nextMonday,
    parseISO,
    previousMonday,
    setWeek,
    startOfToday,
    startOfWeek
} from 'date-fns';
import { nl } from 'date-fns/locale';

export const formatNL = (date: Date, _format: string): string => {
    let dateToFormat = date;
    if (!isDate(dateToFormat)) {
        dateToFormat = parseISO(date as unknown as string);
    }
    return format(dateToFormat, _format, { locale: nl });
};

export function getStartDatumSchooljaar(datum: Date): Date {
    return startOfWeek(new Date(datum.getMonth() <= 6 ? datum.getFullYear() - 1 : datum.getFullYear(), 7, 1), { weekStartsOn: 1 });
}

export function getEindDatumSchooljaar(datum: Date): Date {
    return endOfWeek(new Date(datum.getMonth() <= 6 ? datum.getFullYear() : datum.getFullYear() + 1, 6, 31));
}

export function valtBinnenHuidigeSchooljaar(datum: Date): boolean {
    const vandaag = startOfToday();
    const startDatumSchooljaar = getStartDatumSchooljaar(vandaag);
    const eindDatumSchooljaar = getEindDatumSchooljaar(vandaag);

    return datum >= startDatumSchooljaar && datum <= eindDatumSchooljaar;
}

export function getJaarWeek(peildatum: Date): string {
    return getWeekYear(peildatum) + '~' + getISOWeek(peildatum);
}

export function getJaarWeken(startDatum: Date, eindDatum: Date) {
    const jaarWekenArray: string[] = [];
    let currentDate = startDatum;
    while (isBeforeAndNotSameWeekAndYear(currentDate, eindDatum)) {
        jaarWekenArray.push(getJaarWeek(currentDate));
        currentDate = addWeeks(currentDate, 1);
    }
    jaarWekenArray.push(getJaarWeek(eindDatum));
    return jaarWekenArray;
}

export function isBeforeAndNotSameWeekAndYear(date1: Date, date2: Date) {
    return isBefore(date1, date2) && (getISOWeek(date1) !== getISOWeek(date2) || getWeekYear(date1) !== getWeekYear(date2));
}

export function getMaandagVanJaarWeek(jaarWeek: string): Date {
    const jaar = parseInt(jaarWeek.substring(0, 4));
    const week = parseInt(jaarWeek.substring(5));
    return getMaandagVanWeek(week, jaar);
}

export function getMaandagVanWeeknummerBinnenHuidigSchooljaar(weeknummer?: number): Date | undefined {
    if (!weeknummer) return undefined;

    const vandaag = startOfToday();
    // 1 augustus valt meestal in week 31. Aangezien er midden in de zomervakantie toch geen huiswerk is,
    // geeft het niet dat het niet helemaal klopt.
    const jaarBinnenSchooljaar =
        weeknummer < 31 ? getEindDatumSchooljaar(vandaag).getFullYear() : getStartDatumSchooljaar(vandaag).getFullYear();
    return getMaandagVanWeek(weeknummer, jaarBinnenSchooljaar);
}

export function getMaandagVanWeek(week: number, jaar: number) {
    return setWeek(nextMonday(new Date(jaar, 0, 4)), week);
}

/**
 * Stript de tijdzone van een datumstring en zet deze om naar een Date object in de huidige tijdzone.
 */
export function toLocalDateTime(dateString: string): Date {
    const timezoneIndex = dateString.indexOf('+');
    if (timezoneIndex !== -1) {
        return new Date(dateString.substring(0, timezoneIndex));
    } else if (dateString.endsWith('Z')) {
        return new Date(dateString.substring(0, dateString.length - 1));
    }
    return new Date(dateString);
}

export function isDayInCurrentSchoolyear(givenDate: Date) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const nowIsAugustOrLater = currentDate.getMonth() >= 7;
    const schoolYearStart = new Date(nowIsAugustOrLater ? currentYear : currentYear - 1, 7, 1);
    const schoolYearEnd = new Date(nowIsAugustOrLater ? currentYear + 1 : currentYear, 6, 31, 23, 59, 59, 999);
    return givenDate >= schoolYearStart && givenDate <= schoolYearEnd;
}

export function previousMondayOrDateIfMonday(date: Date) {
    return isMonday(date) ? date : previousMonday(date);
}
export function nextFridayOrDateIfFriday(date: Date) {
    return isFriday(date) ? date : nextFriday(date);
}
