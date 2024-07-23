import { createSelector } from '@ngxs/store';
import { SVakkeuzeModel } from './vakkeuze-model';
import { VakkeuzeState } from './vakkeuze-state';

export class VakkenSelectors {
    public static getVakkeuzes() {
        return createSelector([VakkeuzeState], (state: SVakkeuzeModel) => {
            if (state.vakkeuzes === undefined) return undefined;
            return state.vakkeuzes;
        });
    }
}
