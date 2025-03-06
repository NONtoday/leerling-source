import { createSelector } from '@ngxs/store';
import { SSharedStateModel } from '../shared/shared-model';
import { SharedSelectors } from '../shared/shared-selectors';
import { SLandelijkeMededelingenAccountContext, SLandelijkeMededelingenModel } from './landelijke-mededelingen-model';
import { LandelijkeMededelingenState } from './landelijke-mededelingen-state';

export class LandelijkeMededelingenSelectors {
    public static getLandelijkeMededelingen() {
        return createSelector([LandelijkeMededelingenState], (state: SLandelijkeMededelingenModel) => {
            return state.accounts ?? [];
        });
    }

    public static getCurrentAccountLandelijkeMededelingen() {
        return createSelector(
            [this.getLandelijkeMededelingen(), SharedSelectors.getAccountContext()],
            (
                accounts: SLandelijkeMededelingenAccountContext[],
                state: SSharedStateModel
            ): SLandelijkeMededelingenAccountContext | undefined => {
                return accounts?.find((account: SLandelijkeMededelingenAccountContext) => account.accountUUID === state?.accountUUID);
            }
        );
    }
}
