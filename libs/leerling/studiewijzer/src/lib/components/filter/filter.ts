import { SStudiewijzerItem } from 'leerling/store';
export interface SelectedFilters {
    swiType: string[];
    vak: string[];
}

export function filterStudiewijzerItems(item: SStudiewijzerItem, activeFilters: SelectedFilters): boolean {
    return (
        (activeFilters.swiType.length === 0 || filterType(item, activeFilters)) &&
        (activeFilters.vak.length === 0 || filterVak(item, activeFilters))
    );
}

function filterType(item: SStudiewijzerItem, activeFilters: SelectedFilters): boolean {
    return (
        (activeFilters.swiType.includes(item.huiswerkType) && !item.isInleveropdracht) ||
        (activeFilters.swiType.includes('INLEVEROPDRACHT') && item.isInleveropdracht)
    );
}

function filterVak(item: SStudiewijzerItem, activeFilters: SelectedFilters): boolean {
    return activeFilters.vak.includes(item.vak?.uuid || '');
}
