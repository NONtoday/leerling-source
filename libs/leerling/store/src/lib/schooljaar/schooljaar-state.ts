import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext, StateToken } from '@ngxs/store';
import { RSchooljaar } from 'leerling-codegen';
import { RequestInformationBuilder } from 'leerling-request';
import { tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState } from '../util/abstract-state';
import { RefreshHuidigSchooljaar } from './schooljaar-actions';
import { SSchooljaarState, mapSchooljaar } from './schooljaar-model';

export const SCHOOLJAAR_STATE_TOKEN = new StateToken<SSchooljaarState>('schooljaar');

const DEFAULT_STATE: SSchooljaarState = { huidigSchooljaar: undefined };

@State<SSchooljaarState>({
    name: SCHOOLJAAR_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class SchooljaarState extends AbstractState {
    @Action(RefreshHuidigSchooljaar)
    refreshHuidigSchooljaar(ctx: StateContext<SSchooljaarState>) {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }
        return this.cachedGet<RSchooljaar>('schooljaren/huidig', new RequestInformationBuilder().leerling(leerlingId).build())?.pipe(
            tap((schooljaar) => ctx.patchState({ huidigSchooljaar: mapSchooljaar(schooljaar) }))
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SSchooljaarState>) {
        ctx.setState(DEFAULT_STATE);
    }
    override getTimeout(): number {
        return CallService.SCHOOLJAAR_TIMEOUT;
    }

    @Selector()
    static huidigSchooljaar(state: SSchooljaarState) {
        return state.huidigSchooljaar;
    }
}
