import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { AddErrorMessage, AddInfoMessage, AddSuccessMessage, AddWarningMessage, ClearInfoMessage } from './infomessage-actions';
import { MessageType, SInfoMessage } from './infomessage-model';

export const INFOMESSAGE_STATE_TOKEN = new StateToken<SInfoMessage | undefined>('infomessages');

@State<SInfoMessage | undefined>({
    name: INFOMESSAGE_STATE_TOKEN
})
@Injectable({
    providedIn: 'root'
})
export class InfoMessageState {
    private _latestTimer: any;

    @Action(AddErrorMessage)
    addErrorMessage(ctx: StateContext<SInfoMessage | undefined>, action: AddErrorMessage) {
        this.addMessage(ctx, action.message, 'error');
    }

    @Action(AddInfoMessage)
    addInfoMessage(ctx: StateContext<SInfoMessage | undefined>, action: AddInfoMessage) {
        this.addMessage(ctx, action.message, 'info');
    }

    @Action(AddWarningMessage)
    addWarningMessage(ctx: StateContext<SInfoMessage | undefined>, action: AddInfoMessage) {
        this.addMessage(ctx, action.message, 'warning');
    }

    @Action(AddSuccessMessage)
    addSuccessMessage(ctx: StateContext<SInfoMessage | undefined>, action: AddInfoMessage) {
        this.addMessage(ctx, action.message, 'success');
    }

    @Action(ClearInfoMessage)
    clearState(ctx: StateContext<SInfoMessage | undefined>) {
        // om de IDE/transpiler tevreden te houden
        ctx.setState(undefined as unknown as SInfoMessage);
    }

    private addMessage(ctx: StateContext<SInfoMessage | undefined>, message: string, type: MessageType) {
        ctx.setState({ id: this.generateId(), message: message, type: type });
        if (this._latestTimer) {
            clearTimeout(this._latestTimer);
        }
        this._latestTimer = setTimeout(() => ctx.dispatch(new ClearInfoMessage()), 5000);
    }

    private generateId(): string {
        return Date.now().toString(36);
    }
}
