import { HuiswerkType, SStudiewijzerItem } from 'leerling/store';

export type TitelType = 'vakOfLesgroepnaam' | 'onderwerp';

export function sorteerStudiewijzerItems(items: SStudiewijzerItem[]): SStudiewijzerItem[] {
    const sorteringFuncties = [sorteerAfgevinkt, sorteerInleverOpdracht, sorteerHuiswerkType, sorteerTitel];
    return [...items].sort((lhs, rhs) => {
        for (const sorteringFunctie of sorteringFuncties) {
            const result = sorteringFunctie(lhs, rhs);
            if (result !== 0) return result;
        }
        return 0;
    });
}

export function getVakOfLesgroepNaam(item: SStudiewijzerItem): string | undefined {
    return item.vak?.naam ?? item.lesgroep?.omschrijving ?? item.lesgroep?.naam;
}

export function getTitel(item: SStudiewijzerItem, titelType: TitelType): string {
    const titel = titelType === 'vakOfLesgroepnaam' ? getVakOfLesgroepNaam(item) : item.onderwerp;
    return titel ?? item.onderwerp ?? '-';
}

function sorteerInleverOpdracht(lhs: SStudiewijzerItem, rhs: SStudiewijzerItem) {
    if (lhs.isInleveropdracht && !rhs.isInleveropdracht) return -1;
    if (!lhs.isInleveropdracht && rhs.isInleveropdracht) return 1;
    return 0;
}

const TYPE_MAP = new Map<HuiswerkType, number>([
    ['LESSTOF', 3],
    ['HUISWERK', 2],
    ['TOETS', 1],
    ['GROTE_TOETS', 0]
]);

function sorteerHuiswerkType(lhs: SStudiewijzerItem, rhs: SStudiewijzerItem) {
    return (TYPE_MAP.get(lhs.huiswerkType) ?? 0) - (TYPE_MAP.get(rhs.huiswerkType) ?? 0);
}

function sorteerAfgevinkt(lhs: SStudiewijzerItem, rhs: SStudiewijzerItem) {
    if (lhs.gemaakt && !rhs.gemaakt) return 1;
    if (!lhs.gemaakt && rhs.gemaakt) return -1;
    return 0;
}

function sorteerTitel(lhs: SStudiewijzerItem, rhs: SStudiewijzerItem) {
    return getSimpleTitel(lhs).toLocaleLowerCase().localeCompare(getSimpleTitel(rhs).toLocaleLowerCase());
}

export function getSimpleTitel(item: SStudiewijzerItem) {
    return item.vak?.naam ?? item.onderwerp ?? '-';
}
