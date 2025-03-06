import { createSelector } from '@ngxs/store';
import { endOfDay, isBefore, isMonday, isWithinInterval, previousMonday, startOfDay } from 'date-fns';
import { getJaarWeek } from '../util/date-util';
import { SSWIDag, SSWIModel, SSWIWeek, SStudiewijzerItem } from './huiswerk-model';
import { HuiswerkState } from './huiswerk-state';

const geenLesstofFilter = (item: SStudiewijzerItem): boolean => item.huiswerkType !== 'LESSTOF';

export class HuiswerkSelectors {
    private static getSWIWeek(jaarWeek: string) {
        return createSelector([HuiswerkState], (state: SSWIModel) => {
            return state.jaarWeken?.find((swiWeek) => swiWeek.jaarWeek === jaarWeek);
        });
    }

    static getAantalItemsTotPeilweek(peildatum: Date) {
        const peilweekMaandag = isMonday(peildatum) ? peildatum : previousMonday(peildatum);
        return createSelector([HuiswerkState], (state: SSWIModel) => {
            if (!state.jaarWeken) return 0;

            return (
                state.jaarWeken
                    // Alleen historische jaarweken
                    .filter((jaarweek) => isBefore(jaarweek.dagen[4].datum, peilweekMaandag))
                    // Tel het aantal items per week
                    .map((jaarweek) => jaarweek.weekitems.length + jaarweek.dagen.reduce((som, current) => som + current.items.length, 0))
                    // Tel alles op
                    .reduce((sum, current) => sum + current, 0)
            );
        });
    }

    static heeftHuiswerkWeek(jaarWeek: string) {
        return createSelector([this.getSWIWeek(jaarWeek)], (swiWeek: SSWIWeek) => {
            return swiWeek !== undefined;
        });
    }

    static getSWIDagen(beginDatum: Date, eindDatum: Date) {
        const jaarWeek = getJaarWeek(beginDatum);
        if (jaarWeek !== getJaarWeek(eindDatum)) {
            // Dit ondersteunen we niet omdat ik verwacht dat we niet meer dan 1 week per keer tonen.
            throw new Error(beginDatum + 'valt in een andere week dan ' + eindDatum);
        }
        return createSelector([this.getSWIWeek(jaarWeek)], (swiWeek: SSWIWeek) => {
            if (swiWeek === undefined) return undefined;
            const dagen =
                swiWeek.dagen.filter((dag) => isWithinInterval(dag.datum, { start: startOfDay(beginDatum), end: endOfDay(eindDatum) })) ??
                [];
            return dagen.map((dag) => ({
                ...dag,
                items: dag.items
            }));
        });
    }

    static getSWIWeekItems(datum: Date) {
        const jaarWeek = getJaarWeek(datum);
        return createSelector([this.getSWIWeek(jaarWeek)], (swiWeek: SSWIWeek) => swiWeek?.weekitems.filter(geenLesstofFilter));
    }

    static getStudiewijzerDagItems(datum: Date) {
        return createSelector([this.getSWIDagen(datum, datum)], (swiDagen: SSWIDag[] | undefined) => {
            return swiDagen?.flatMap((swiDag) => swiDag.items).filter(geenLesstofFilter);
        });
    }

    static getStudiewijzerItem(jaarWeek: string, id: number) {
        return createSelector([this.getSWIWeek(jaarWeek)], (swiWeek: SSWIWeek) => {
            if (!swiWeek) return undefined;

            const weekItem = swiWeek.weekitems.find((item) => item.id === id);
            if (weekItem) return weekItem;

            return swiWeek.dagen.flatMap((swiDag) => swiDag.items).find((item) => item.id === id);
        });
    }

    static getStudiewijzerDagItemsVoorHeleWeek(beginDatum: Date, eindDatum: Date) {
        return createSelector([this.getSWIDagen(beginDatum, eindDatum)], (swiDagen: SSWIDag[] | undefined) => {
            return swiDagen?.flatMap((swiDag) => swiDag.items).filter(geenLesstofFilter);
        });
    }

    static getStudiewijzerWeekItems(datum: Date) {
        const jaarWeek = getJaarWeek(datum);
        return createSelector([this.getSWIWeek(jaarWeek)], (swiWeek: SSWIWeek) => {
            return swiWeek?.weekitems?.filter(geenLesstofFilter);
        });
    }
}
