import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { SwitchContext, UpdateConnectionStatus } from './shared-actions';
import { SSharedStateModel } from './shared-model';

export const SHARED_STATE_TOKEN = new StateToken<SSharedStateModel>('shared');

@State<SSharedStateModel>({
    name: SHARED_STATE_TOKEN,
    defaults: {
        localAuthenticationContext: '',
        accountUUID: undefined,
        leerlingId: undefined,
        isOnline: true,
        limitedData: false
    }
})
@Injectable({
    providedIn: 'root'
})
export class SharedState {
    @Action(SwitchContext)
    switchContext(ctx: StateContext<SSharedStateModel>, action: SwitchContext) {
        ctx.setState(
            patch<SSharedStateModel>({
                localAuthenticationContext: action.localAuthenticationContext,
                accountUUID: action.accountUUID,
                leerlingId: action.leerlingId
            })
        );
    }

    @Action(UpdateConnectionStatus)
    updateConnectionStatus(ctx: StateContext<SSharedStateModel>, action: UpdateConnectionStatus) {
        ctx.setState(
            patch({
                isOnline: action.isOnline,
                limitedData: action.limitedData
            })
        );
    }
}
