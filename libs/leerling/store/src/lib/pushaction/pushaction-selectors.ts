import { createSelector } from '@ngxs/store';
import { SPushAction } from './pushaction-model';
import { PushActionState } from './pushaction-state';

export class PushActionSelectors {
    public static getPushActionState() {
        return createSelector([PushActionState], (state: SPushAction) => {
            return state;
        });
    }
}
