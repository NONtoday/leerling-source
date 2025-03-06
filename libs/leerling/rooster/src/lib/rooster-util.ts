import { addHours, differenceInMinutes, startOfDay } from 'date-fns';
import { range } from 'lodash-es';
import { ROOSTER_ITEM_MIN_HEIGHT } from './components/rooster-dag/rooster-item-positie-util';
import { RoosterItem } from './services/rooster-model';

export const UUR_HEIGHT = 84;
export const BEGIN_UUR_TIJDLIJN = 6;
export const EIND_UUR_TIJDLIJN = 18;
const MARGIN_TOP = 16;

export interface RoosterTijdlijnLabel {
    label: string;
}

export const ROOSTER_TIJDLIJN_LABELS: RoosterTijdlijnLabel[] = [
    { label: '' },
    { label: 'Eerder' },
    ...range(BEGIN_UUR_TIJDLIJN + 2, EIND_UUR_TIJDLIJN + 1).map((uur) => {
        return { label: `${uur}:00` };
    }),
    { label: 'Later' }
];

export const MAX_AANTAL_BLOKKEN = ROOSTER_TIJDLIJN_LABELS.length;
export const MAX_HEIGHT = UUR_HEIGHT * MAX_AANTAL_BLOKKEN - 12;

export const berekenHuidigeTijdlijnTop = (): number => {
    return berekenTop(new Date());
};

export const berekenTop = (datum: Date): number => {
    const uren = datum.getHours() - BEGIN_UUR_TIJDLIJN;
    const minuten = datum.getMinutes();
    const height = UUR_HEIGHT * uren + berekenHeightVoorMinuten(minuten);
    return Math.max(Math.round(height), 0);
};

export const berekenTopEnHeight = (item: RoosterItem): { top: number; height: number } => {
    const beginUur = item.beginDatumTijd.getHours();

    if (beginUur < BEGIN_UUR_TIJDLIJN) {
        const top = MARGIN_TOP;
        const verschilMinutenVanafBeginTijdlijn = differenceInMinutes(
            item.eindDatumTijd,
            addHours(startOfDay(item.beginDatumTijd), BEGIN_UUR_TIJDLIJN)
        );
        const height = berekenHeightVoorMinuten(verschilMinutenVanafBeginTijdlijn) - MARGIN_TOP;
        const minHeight = UUR_HEIGHT - 14;
        const maxHeight = MAX_HEIGHT - top;
        return {
            top,
            height: Math.min(Math.max(minHeight, height), maxHeight) // clamp height
        };
    } else if (beginUur > EIND_UUR_TIJDLIJN) {
        return {
            top: (MAX_AANTAL_BLOKKEN - 1) * UUR_HEIGHT,
            height: UUR_HEIGHT - 12
        };
    }

    const top = Math.max(MARGIN_TOP, berekenTop(item.beginDatumTijd));
    let height = Math.max(ROOSTER_ITEM_MIN_HEIGHT, berekenHeightVoorMinuten(item.duurInMinuten));
    if (top + height > MAX_HEIGHT) {
        height = MAX_HEIGHT - top;
    }
    return {
        top,
        height
    };
};

const MINUUT_HEIGHT = UUR_HEIGHT / 60;
const berekenHeightVoorMinuten = (duurInMinuten: number): number => Math.round(MINUUT_HEIGHT * duurInMinuten);
