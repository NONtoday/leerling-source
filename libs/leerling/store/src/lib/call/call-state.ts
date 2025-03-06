import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { produce } from 'immer';
import { SwitchContext } from '../shared/shared-actions';
import { MarkDirty, StoreCallStart, StoreCallSuccess } from './call-actions';
import { SCallModel } from './call-model';

export const CALL_STATE_TOKEN = new StateToken<SCallModel>('call');
const DEFAULT_STATE = {
    callTypes: {}
};

@State<SCallModel>({
    name: CALL_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class CallState {
    @Action(MarkDirty)
    markDirty(ctx: StateContext<SCallModel>, action: MarkDirty) {
        const callTypes = Object.assign({}, ctx.getState().callTypes);
        delete callTypes[action.callNaam];
        ctx.setState({ callTypes: callTypes });
    }

    @Action(StoreCallSuccess)
    storeCallSuccess(ctx: StateContext<SCallModel>, action: StoreCallSuccess) {
        const newTimestamp: number = new Date().getTime();

        ctx.setState(
            produce(ctx.getState(), (draft) => {
                let existingCallType = draft.callTypes[action.callNaam];

                if (!existingCallType) {
                    existingCallType = { naam: action.callNaam, tsLastSync: newTimestamp, calls: [] };
                    draft.callTypes[action.callNaam] = existingCallType;
                }

                if (existingCallType.tsLastSync && existingCallType.tsLastSync + action.timeout < newTimestamp) {
                    // Alle calls zijn te oud, we hebben de oude calls niet meer nodig.
                    existingCallType.calls = [];
                }

                existingCallType.tsLastSync = newTimestamp;

                const call = existingCallType.calls.find((item) => item.paramsJsonStringify === JSON.stringify(action.parameters));
                if (call) {
                    call.tsLastSync = newTimestamp;
                } else {
                    existingCallType.calls.push({
                        naam: action.callNaam,
                        paramsJsonStringify: JSON.stringify(action.parameters),
                        tsLastSync: newTimestamp,
                        tsLastCallStarted: newTimestamp
                    });
                }
            })
        );
    }

    @Action(StoreCallStart)
    storeCallStart(ctx: StateContext<SCallModel>, action: StoreCallStart) {
        const newTimestamp: number = new Date().getTime();

        ctx.setState(
            produce(ctx.getState(), (draft) => {
                let existingCallType = draft.callTypes[action.callNaam];

                if (!existingCallType) {
                    existingCallType = { naam: action.callNaam, calls: [] };
                    draft.callTypes[action.callNaam] = existingCallType;
                }

                const call = existingCallType.calls.find((item) => item.paramsJsonStringify === JSON.stringify(action.parameters));
                if (call) {
                    call.tsLastCallStarted = newTimestamp;
                } else {
                    existingCallType.calls.push({
                        naam: action.callNaam,
                        paramsJsonStringify: JSON.stringify(action.parameters),
                        tsLastCallStarted: newTimestamp
                    });
                }
            })
        );
    }

    @Action(SwitchContext)
    switchContext(ctx: StateContext<SCallModel>) {
        return ctx.setState(DEFAULT_STATE);
    }
}
