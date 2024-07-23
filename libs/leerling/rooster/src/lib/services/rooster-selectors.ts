import { createSelector } from '@ngxs/store';
import { AfspraakSelectors, HuiswerkSelectors, RechtenSelectors, SAfspraakDag, SRechten, SSWIDag, SStudiewijzerItem } from 'leerling/store';
import { RoosterViewModel, getRooster } from './rooster-model';

export class RoosterSelectors {
    public static getDagEnWeekItems(beginDatum: Date, eindDatum: Date) {
        return createSelector([RoosterSelectors.getViewModel(beginDatum, eindDatum)], (roosterViewModel: RoosterViewModel | undefined) => {
            return roosterViewModel ?? undefined;
        });
    }

    public static getViewModel(beginDatum: Date, eindDatum: Date) {
        return createSelector(
            [
                AfspraakSelectors.getDagAfspraken(beginDatum, eindDatum),
                HuiswerkSelectors.getSWIDagen(beginDatum, eindDatum),
                HuiswerkSelectors.getSWIWeekItems(beginDatum),
                RechtenSelectors.getCurrentAccountRechten()
            ],
            (
                afspraakDagen: SAfspraakDag[] | undefined,
                swiDagen: SSWIDag[] | undefined,
                weekitems: SStudiewijzerItem[] | undefined,
                rechten: SRechten
            ) => {
                if (!afspraakDagen || !swiDagen || !weekitems) return undefined;
                const toonLesuren = !rechten.lesurenVerbergenSettingAan ?? true;
                return getRooster(beginDatum, eindDatum, afspraakDagen, swiDagen, weekitems, toonLesuren);
            }
        );
    }
}
