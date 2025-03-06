import { createSelector } from '@ngxs/store';
import { SSharedAccountStateModel, SSharedConnectionStateModel, SSharedStateModel } from './shared-model';
import { SharedState } from './shared-state';

export class SharedSelectors {
    public static getAccountContext() {
        return createSelector([SharedState], (state: SSharedStateModel) => {
            return {
                localAuthenticationContext: state.localAuthenticationContext,
                accountUUID: state.accountUUID,
                leerlingId: state.leerlingId
            } satisfies SSharedAccountStateModel;
        });
    }

    public static getConnectionStatus() {
        return createSelector([SharedState], (state: SSharedStateModel) => {
            return { isOnline: state.isOnline, limitedData: state.limitedData } satisfies SSharedConnectionStateModel;
        });
    }
}
