import { createSelector } from '@ngxs/store';
import { SInleverOpdrachtenModel } from './inleveropdracht-list-model';
import { InleveropdrachtListState } from './inleveropdracht-list-state';

export class InleveropdrachtListSelectors {
    public static getInleverOpdrachten() {
        return createSelector([InleveropdrachtListState], (state: SInleverOpdrachtenModel) => state.inleverOpdrachten);
    }
}
