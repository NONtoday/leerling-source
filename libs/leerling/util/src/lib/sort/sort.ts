import { get } from 'lodash-es';

export type SorteerOrder = 'asc' | 'desc';

export const sortLocale = <T>(toSort: T[], sorteringsVelden: (keyof T)[], sortOrders: SorteerOrder[] = ['asc']): T[] =>
    sortLocaleNested(toSort, (value: T) => value, sorteringsVelden, sortOrders);

export const sortLocaleNested = <T, U>(
    toSort: T[],
    nestedProperty: (t: T) => U,
    sorteringsVelden: (keyof U)[],
    sortOrders: SorteerOrder[] = ['asc']
): T[] => {
    const toSortSpreaded = toSort ? [...toSort] : [];
    return toSortSpreaded.sort((a, b) => {
        const nestedA = nestedProperty(a);
        const nestedB = nestedProperty(b);

        for (const [i, sortVeld] of sorteringsVelden.entries()) {
            let sortedValue = 0;

            const aValueToSort = get(nestedA, sortVeld);
            const bValueToSort = get(nestedB, sortVeld);

            if (typeof aValueToSort === 'string' && typeof bValueToSort === 'string') {
                sortedValue = aValueToSort.toString().toLowerCase().localeCompare(bValueToSort.toString().toLowerCase());
            } else {
                if (aValueToSort > bValueToSort) sortedValue = 1;
                if (aValueToSort < bValueToSort) sortedValue = -1;
            }

            if (sortedValue !== 0) {
                const order = sortOrders[i] ? sortOrders[i] : 'asc';

                return order === 'desc' ? sortedValue * -1 : sortedValue;
            }
        }

        return 0;
    });
};
