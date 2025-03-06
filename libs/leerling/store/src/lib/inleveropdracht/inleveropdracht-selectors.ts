import { createSelector } from '@ngxs/store';
import { SInleverModel } from './inleveropdracht-model';
import { InleveropdrachtState } from './inleveropdracht-state';

export class InleveropdrachtSelectors {
    public static getInleverDetails(toekenningId: number) {
        return createSelector([InleveropdrachtState], (state: SInleverModel) => {
            if (state.inleverDetails === undefined) return undefined;
            return state.inleverDetails[toekenningId];
        });
    }
}
