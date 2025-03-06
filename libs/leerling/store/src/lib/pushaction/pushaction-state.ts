import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { ClearPushAction, IncomingPushAction } from './pushaction-actions';
import { SPushAction } from './pushaction-model';
export const PUSH_ACTION_STATE_TOKEN = new StateToken<SPushAction | undefined>('pushaction');

@State<SPushAction | undefined>({
    name: PUSH_ACTION_STATE_TOKEN
})
@Injectable({
    providedIn: 'root'
})
export class PushActionState {
    private _latestTimer: any;

    @Action(IncomingPushAction)
    incomingPushAction(ctx: StateContext<SPushAction | undefined>, action: IncomingPushAction) {
        ctx.setState({
            type: action.type,
            leerlingId: action.leerlingId,
            accountUUID: action.accountUUID,
            entityId: action.entityId,
            datum: action.datum,
            triggered: action.triggered
        });
        if (this._latestTimer) {
            clearTimeout(this._latestTimer);
        }
        this._latestTimer = setTimeout(() => ctx.dispatch(new ClearPushAction()), 5000);
    }

    @Action(ClearPushAction)
    clearState(ctx: StateContext<SPushAction | undefined>) {
        ctx.setState(undefined as unknown as SPushAction);
    }
}
