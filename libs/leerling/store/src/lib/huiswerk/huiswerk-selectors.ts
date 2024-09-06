import { createSelector } from '@ngxs/store';
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns';
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
