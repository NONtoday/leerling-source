import { createSelector } from '@ngxs/store';
import { isWithinInterval } from 'date-fns';
import { getJaarWeek } from '../util/date-util';
import { SAfspraakModel, SAfspraakWeek } from './afspraak-model';
import { AfspraakState } from './afspraak-state';

export class AfspraakSelectors {
    private static getSAfspraakWeek(jaarWeek: string) {
        return createSelector([AfspraakState], (state: SAfspraakModel) => {
            if (state.jaarWeken === undefined) return undefined;
            return state.jaarWeken.find((SAfspraakWeek) => SAfspraakWeek.jaarWeek === jaarWeek) ?? undefined;
        });
    }

    static heeftAfspraakWeek(jaarWeek: string) {
        return createSelector([this.getSAfspraakWeek(jaarWeek)], (sAfspraakWeek: SAfspraakWeek) => {
            return sAfspraakWeek !== undefined;
        });
    }

    static getDagAfspraken(beginDatum: Date, eindDatum: Date) {
        const jaarWeek = getJaarWeek(beginDatum);
        if (jaarWeek !== getJaarWeek(eindDatum)) {
            // Dit ondersteunen we niet omdat ik verwacht dat we niet meer dan 1 week per keer tonen.
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            throw new Error(beginDatum + 'valt in een andere week dan ' + eindDatum);
        }

        return createSelector([this.getSAfspraakWeek(jaarWeek)], (sAfspraakWeek: SAfspraakWeek) => {
            if (sAfspraakWeek === undefined) return undefined;
            return sAfspraakWeek.dagen.filter((dag) => isWithinInterval(dag.datum, { start: beginDatum, end: eindDatum })) ?? [];
        });
    }

    static getWeekNotifications(date: Date) {
        const jaarWeek = getJaarWeek(date);
        return createSelector([this.getSAfspraakWeek(jaarWeek)], (sAfspraakWeek: SAfspraakWeek) => {
            return sAfspraakWeek?.statusNotications ?? [];
        });
    }
}
