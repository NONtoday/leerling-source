import { addDays, startOfToday, subDays } from 'date-fns';
import { SAfspraakModel, SAfspraakWeek } from '../afspraak/afspraak-model';
import { SSWIModel, SSWIWeek } from '../huiswerk/huiswerk-model';
import { getJaarWeek } from './date-util';

const DATE_REGEX =
    /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;

export function datumReviver(key: any, value: string): Date | string {
    return DATE_REGEX.test(value) ? new Date(value) : value;
}

export function saveHuidigeWekenBereik(obj: SAfspraakModel | SSWIModel): SAfspraakModel | SSWIModel {
    const vandaag = startOfToday();
    const wekenOmTeControleren = [subDays(vandaag, 7), vandaag, addDays(vandaag, 7)].map((datum) => getJaarWeek(datum));
    const jaarWeken: (SAfspraakWeek | SSWIWeek)[] | undefined = obj?.jaarWeken;
    const bereikWeken: (SAfspraakWeek | SSWIWeek)[] | undefined =
        jaarWeken?.filter((jaarWeek) => wekenOmTeControleren.includes(jaarWeek.jaarWeek)) ?? undefined;
    return { jaarWeken: bereikWeken } as SAfspraakModel | SSWIModel;
}
