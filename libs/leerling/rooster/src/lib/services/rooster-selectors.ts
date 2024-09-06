import { createSelector } from '@ngxs/store';
import {
    AfspraakSelectors,
    HuiswerkSelectors,
    MaatregelState,
    RechtenSelectors,
    SAfspraakDag,
    SMaatregelToekenning,
    SRechten,
    SSWIDag,
    SStudiewijzerItem
} from 'leerling/store';
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
                MaatregelState.actieveMaatregelenPeriode(beginDatum, eindDatum),
                RechtenSelectors.getCurrentAccountRechten()
            ],
            (
                afspraakDagen: SAfspraakDag[] | undefined,
                swiDagen: SSWIDag[] | undefined,
                weekitems: SStudiewijzerItem[] | undefined,
                maatregelen: SMaatregelToekenning[] | undefined,
                rechten: SRechten
            ) => {
                if (!afspraakDagen || !swiDagen || !weekitems) return undefined;
                const toonLesuren = !rechten.lesurenVerbergenSettingAan ?? true;
                return getRooster(beginDatum, eindDatum, afspraakDagen, swiDagen, maatregelen ?? [], weekitems, toonLesuren);
            }
        );
    }
}
