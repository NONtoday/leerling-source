import { endOfWeek, format, getWeekYear, isDate, nextMonday, parseISO, setWeek, startOfToday, startOfWeek } from 'date-fns';
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
    return getWeekYear(peildatum) + '~' + format(peildatum, 'I');
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
