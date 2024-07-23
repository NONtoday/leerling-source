import { berekenTopEnHeight } from '../../rooster-util';
import { RoosterItem } from '../../services/rooster-model';

export const ROOSTER_DAG_MARGIN_RIGHT = 12;
export const ROOSTER_DAG_ITEM_MARGIN = 4;
export const ROOSTER_ITEM_MIN_HEIGHT = 32;

export interface RoosterItemMetPositie {
    roosterItem: RoosterItem;
    positie: RoosterItemPositie;
}

interface RoosterItemPositie extends VerticalPositie {
    left: number;
    width: number;
}

interface VerticalPositie {
    top: number;
    bottom: number;
    height: number;
}

export interface RoosterItemVerticalPositieGroep extends RoosterItemVerticalPositie {
    subgroepen: RoosterItemVerticalPositie[][];
}

export interface RoosterItemVerticalPositie extends VerticalPositie {
    item: RoosterItem;
    ignoreForSubgroep?: boolean;
}

function isRoosterItemGroep(item: RoosterItemVerticalPositie): item is RoosterItemVerticalPositieGroep {
    return 'subgroepen' in item;
}

interface VrijeKolom {
    offset: number;
    aantal: number;
    verticalPositie: VerticalPositie;
}

export function mapToRoosterItemsMetPositie(items: RoosterItem[] | undefined, elementWidth: number): RoosterItemMetPositie[] | undefined {
    if (!items) return undefined;

    return bepaalBlokken(items)
        .map((groep) => getRoosterItemsMetPositieVoorGroep(groep, elementWidth - ROOSTER_DAG_MARGIN_RIGHT))
        .flat()
        .sort((a, b) => a.positie.top - b.positie.top);
}

function bepaalBlokken(items: RoosterItem[]): RoosterItemVerticalPositieGroep[][] {
    const sortedItems = sorteerItems(items);
    const itemsVertialPosition = mapItemsToVerticalPositions(sortedItems);

    const blokken: RoosterItemVerticalPositieGroep[][] = [];
    let grootsteEinde = -Infinity;

    for (const item of itemsVertialPosition) {
        // Maak een nieuwe blok aan als het item minimaal even laag is als het tot nu toe grootste punt.
        // Dit item heeft dan GEEN overlap met één van de eerdere items.
        if (item.top >= grootsteEinde) {
            grootsteEinde = item.bottom;
            blokken.push([{ ...item, subgroepen: [] }]);
            continue;
        }

        // Voeg toe aan huidig blok omdat er overlap is met één van de eerdere items.
        const huidigBlok = blokken[blokken.length - 1];
        const huidigeGroep = huidigBlok[huidigBlok.length - 1];

        // Bepaal vorige groep
        const vorigeGroep = huidigBlok[huidigBlok.length - 2];
        const vorigeGroepEinde = vorigeGroep ? vorigeGroep.bottom : -Infinity;

        // Controleer of een item volledig binnen de huidige groep valt zonder overlap met de groep ervoor
        if (item.bottom < huidigeGroep.bottom && item.top > vorigeGroepEinde) {
            // Probeer het item toe te voegen aan een bestaande subgroep
            const isToegevoegd = voegToeAanSubgroep(huidigeGroep, item);
            if (!isToegevoegd) {
                // Item wordt een eigen subgroep omdat deze niet in een van de subgroepen past.
                huidigeGroep.subgroepen.push([item]);
            }
        } else {
            // Maak een nieuwe groep in het huidige blok omdat deze niet in één van de groepen past, maar wel binnen dit blok valt.
            huidigBlok.push({
                ...item,
                subgroepen: []
            });
        }

        // Update grootste einde indien item lager eindigt
        if (item.bottom > grootsteEinde) {
            grootsteEinde = item.bottom;
        }
    }

    return blokken;
}

function mapItemsToVerticalPositions(items: RoosterItem[]): RoosterItemVerticalPositie[] {
    // Een item aan het eind van de dag moet nog steeds minimaal met hoogte getoond worden.
    return items.map((item) => {
        const topEnHeight = berekenTopEnHeight(item);
        return { item, top: topEnHeight.top, height: topEnHeight.height, bottom: topEnHeight.top + topEnHeight.height };
    });
}

function sorteerItems(items: RoosterItem[]): RoosterItem[] {
    return items.sort((lhs, rhs) => {
        const beginDatumCompare = lhs.beginDatumTijd.getTime() - rhs.beginDatumTijd.getTime();
        return beginDatumCompare !== 0 ? beginDatumCompare : rhs.eindDatumTijd.getTime() - lhs.eindDatumTijd.getTime();
    });
}

/**
 * @returns true als het item is toegevoegd aan een subgroep, anders false.
 */
function voegToeAanSubgroep(groep: RoosterItemVerticalPositieGroep, item: RoosterItemVerticalPositie): boolean {
    for (const subgroep of groep.subgroepen) {
        for (const subgroepItem of subgroep) {
            if (item.top < subgroepItem.bottom) {
                subgroep.push(item);
                return true;
            }
        }
    }
    return false;
}

function getRoosterItemsMetPositieVoorGroep(groep: RoosterItemVerticalPositieGroep[], elementWidth: number): RoosterItemMetPositie[] {
    const kolommen = bepaalKolommen(groep);

    // Een copy van kolommen waar subgroepen aan toegevoegd worden om aantal vrije kolommen juist te bepalen.
    // Subgroepen staan niet in de 'kolommen' omdat deze bij het groepitem worden gerenderd.
    // Deze zouden dubbel gerenderd worden als ze aan de 'kolommen' toegevoegd worden.
    const kolommenMetSubgroepen: RoosterItemVerticalPositie[][] = kolommen.map((kolom) => [...kolom]);

    const result: RoosterItemMetPositie[] = [];
    kolommen.forEach((kolom, kolomIndex) => {
        kolom.forEach((item) => {
            if (item.ignoreForSubgroep) return;
            const kolomBreedte = elementWidth / kolommen.length;

            // Render subgroepen als het item een groep is.
            if (isRoosterItemGroep(item)) {
                // Bepaal vrijekolommen waar subgroepen gerenderd kunnen worden.
                const vrijekolommenVoorSubgroepen = getVrijekolomPositieVoorSubgroepen(kolommenMetSubgroepen, item);

                // Bepaal positie voor subgroepen
                item.subgroepen.forEach((subgroep, index) => {
                    const vrijekolommen = vrijekolommenVoorSubgroepen[index];

                    // Voeg subgroep toe aan 'kolommenMetSubgroepen' om overlap juist te kunnen bepalen voor items die nog komen.
                    kolommenMetSubgroepen[vrijekolommen.offset].push({
                        top: vrijekolommen.verticalPositie.top,
                        height: vrijekolommen.verticalPositie.bottom - vrijekolommen.verticalPositie.top,
                        bottom: vrijekolommen.verticalPositie.bottom,
                        item: subgroep[0].item
                    });

                    // Bepaal positie van subgroepen
                    const offset = vrijekolommen.offset * kolomBreedte;
                    const subgroepWidth = kolomBreedte * vrijekolommen.aantal - ROOSTER_DAG_ITEM_MARGIN;
                    result.push(...berekenPositieVoorSubgroep(subgroep, subgroepWidth, offset));
                });
            }

            // Bepaal positie voor item
            result.push({
                roosterItem: item.item,
                positie: berekenItemPositie(item, kolommenMetSubgroepen, kolomIndex, kolomBreedte)
            });
        });
    });
    return result;
}

/**
 * Plaats overlappende items in verschillende kolommen zodat deze naast elkaar getoond kunnen worden.
 */
function bepaalKolommen(items: RoosterItemVerticalPositie[] | RoosterItemVerticalPositieGroep[]): RoosterItemVerticalPositie[][] {
    const kolommen: RoosterItemVerticalPositie[][] = [];

    items.forEach((item) => {
        let isToegevoegd = false;

        kolommen.forEach((kolomItems) => {
            if (isToegevoegd) return;

            let isBezet = false;

            kolomItems.forEach((kolomItem) => {
                if (heeftOverlap(item, kolomItem)) {
                    isBezet = true;
                    return;
                }
            });

            // Geen overlap, voeg item toe aan kolom.
            if (!isBezet) {
                kolomItems.push(item);
                isToegevoegd = true;
            }
        });

        if (!isToegevoegd) {
            // Voeg item toe aan een nieuwe kolom, omdat deze overlap heeft met een item uit elke bestaande kolom.
            kolommen.push([item]);

            if (isRoosterItemGroep(item)) {
                // In het geval van één kolom met een item met subgroepen, is er geen lege ruimte dus voeg een tweede kolom met dezelfde tijdblokkade.
                // ignoreForSubgroep zorgt ervoor dat de subgroep hier wel ingeplaatst mag worden maar andere items niet.
                // In andere gevallen met subgroepen is er al ergens lege ruimte waar dit item geplaatst kan worden, dus geen extra kolom nodig.
                if (item.subgroepen.length > 0 && kolommen.length === 1) {
                    kolommen.push([{ ...item, ignoreForSubgroep: true }]);
                }
            }
        }
    });

    return kolommen;
}

/**
 * Dit is een inclusieve check, als de bottom de top raakt is er ook overlap.
 */
function heeftOverlap<T extends VerticalPositie>(lhs: T, rhs: T): boolean {
    return lhs.top < rhs.bottom && lhs.bottom > rhs.top;
}

function getVrijekolomPositieVoorSubgroepen(kolommen: RoosterItemVerticalPositie[][], item: RoosterItemVerticalPositieGroep): VrijeKolom[] {
    return item.subgroepen.map((subgroep) => {
        const verticalPositie = getSubgroepVerticalPositie(subgroep);
        const vrijekolom = getVrijekolomVoorPositie(kolommen, verticalPositie, true);
        return {
            offset: vrijekolom.offset,
            aantal: vrijekolom.aantal,
            verticalPositie
        };
    });
}

function getSubgroepVerticalPositie(items: RoosterItemVerticalPositie[]): VerticalPositie {
    return items.reduce(
        (acc, current) => {
            acc.top = Math.min(acc.top, current.top);
            acc.bottom = Math.max(acc.bottom, current.bottom);
            acc.height = acc.bottom - acc.top;
            return acc;
        },
        {
            top: Infinity,
            bottom: -Infinity,
            height: 0
        }
    );
}

function getVrijekolomVoorPositie(kolommen: RoosterItemVerticalPositie[][], verticalPositie: VerticalPositie, skipIgnore = false) {
    let offset = 0;
    let aantal = 0;
    let grootsteAantal = 0;
    let grootsteOffset = 0;

    const updateGrootsteAantal = () => {
        if (aantal > grootsteAantal) {
            grootsteAantal = aantal;
            grootsteOffset = offset;
            aantal = 0;
        }
    };

    for (let index = 0; index < kolommen.length; index++) {
        const isOverlapping = kolommen[index].some((kolomItem) =>
            kolomItem.ignoreForSubgroep && skipIgnore ? false : heeftOverlap(kolomItem, verticalPositie)
        );

        if (isOverlapping) {
            updateGrootsteAantal();
            offset = index + 1;
        } else {
            aantal++;
        }
    }

    updateGrootsteAantal();

    return {
        aantal: grootsteAantal,
        offset: grootsteOffset
    };
}

function berekenPositieVoorSubgroep(groep: RoosterItemVerticalPositie[], elementWidth: number, offset: number): RoosterItemMetPositie[] {
    const kolommen = bepaalKolommen(groep);
    return kolommen
        .map((kolom, kolomIndex) =>
            kolom.map((item) => ({
                roosterItem: item.item,
                positie: berekenItemPositie(item, kolommen, kolomIndex, elementWidth / kolommen.length, offset)
            }))
        )
        .flat();
}

function berekenItemPositie(
    item: RoosterItemVerticalPositie,
    kolommen: RoosterItemVerticalPositie[][],
    kolomIndexVanItem: number,
    kolomWidth: number,
    offset = 0
): RoosterItemPositie {
    const vrijKolommen = aantalNietOverlappendeKolommen(kolommen, kolomIndexVanItem, item);
    const vrijKolommenWidth = kolomWidth * vrijKolommen;
    const itemWidth = Math.round(kolomWidth - ROOSTER_DAG_ITEM_MARGIN + vrijKolommenWidth);
    // Haal de margin van de hoogte op het laatste punt eraf om een minimale gap van 4px te garanderen
    return {
        top: item.top,
        left: Math.round(kolomWidth * kolomIndexVanItem + offset),
        bottom: item.bottom,
        width: itemWidth,
        height: item.height - ROOSTER_DAG_ITEM_MARGIN
    };
}

function aantalNietOverlappendeKolommen(
    kolommen: RoosterItemVerticalPositie[][],
    huidigeIndex: number,
    item: RoosterItemVerticalPositie
): number {
    let aantalNietOverlappendeKolommen = 0;

    for (let kolomIndex = huidigeIndex + 1; kolomIndex < kolommen.length; kolomIndex++) {
        const isOverlapping = kolommen[kolomIndex].some((kolomItem) => heeftOverlap(item, kolomItem));
        if (isOverlapping) break;
        aantalNietOverlappendeKolommen++;
    }

    return aantalNietOverlappendeKolommen;
}
export const exportForTesting = {
    bepaalBlokken,
    mapItemsToVerticalPositions,
    sorteerItems,
    bepaalKolommen,
    heeftOverlap,
    getSubgroepVerticalPositie,
    getVrijekolomVoorPositie,
    berekenItemPositie,
    aantalNietOverlappendeKolommen
};
