import { createSelector } from '@ngxs/store';
import { SExamendossierContextModel } from './examendossiercontext-model';
import { ExamendossierContextState } from './examendossiercontext-state';

export class ExamendossierContextSelectors {
    public static getExamendossierContexten() {
        return createSelector([ExamendossierContextState], (state: SExamendossierContextModel) => {
            if (state.contexten === undefined) return undefined;
            return state.contexten;
        });
    }
}
