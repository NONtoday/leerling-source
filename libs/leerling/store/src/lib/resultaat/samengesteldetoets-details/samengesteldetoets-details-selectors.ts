import { createSelector } from '@ngxs/store';
import { SSamengesteldeToetsModel } from './samengesteldetoets-details-model';
import { SamengesteldeToetsDetailsState } from './samengesteldetoets-details-state';

export class SamengesteldeToetsDetailsSelectors {
    public static getSamengesteldeToets(deeltoetsId: number) {
        return createSelector([SamengesteldeToetsDetailsState], (state: SSamengesteldeToetsModel) => {
            if (state.samengesteldeToetsen === undefined) return undefined;
            return (
                state.samengesteldeToetsen[deeltoetsId] ?? {
                    omschrijving: '',
                    formattedResultaat: '',
                    isOnvoldoende: false
                }
            );
        });
    }
}
