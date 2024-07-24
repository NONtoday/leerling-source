import { createSelector } from '@ngxs/store';
import { SVakkeuzeGemiddeldeModel } from './vakkeuze-gemiddelde-model';
import { VakkeuzeGemiddeldeState } from './vakkeuze-gemiddelde-state';

export class VakkeuzeGemiddeldeSelectors {
    public static getVakkeuzeGemiddelden(plaatsingUuid: string) {
        return createSelector([VakkeuzeGemiddeldeState], (state: SVakkeuzeGemiddeldeModel) => {
            if (state.vakkeuzeGemiddelden === undefined) return undefined;
            return state.vakkeuzeGemiddelden.find((vakkeuzeGemiddelde) => vakkeuzeGemiddelde.plaatsingUuid === plaatsingUuid);
        });
    }
}
