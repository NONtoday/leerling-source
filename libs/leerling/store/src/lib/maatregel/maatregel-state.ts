import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext, StateToken } from '@ngxs/store';
import { RMaatregelToekenning } from 'leerling-codegen';
import { tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState } from '../util/abstract-state';
import { RefreshMaatregelen } from './maatregel-actions';
import { SMaatregelenState, mapMaatregelToekenning } from './maatregel-model';

export const MAATREGEL_STATE_TOKEN = new StateToken<SMaatregelenState>('maatregel');

const DEFAULT_STATE: SMaatregelenState = { actieveMaatregelen: undefined };

@State<SMaatregelenState>({
    name: MAATREGEL_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class MaatregelState extends AbstractState {
    @Action(RefreshMaatregelen)
    refreshMaatregelen(ctx: StateContext<SMaatregelenState>) {
        const leerlingId: number | undefined = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }
        return this.cachedUnwrappedGet<RMaatregelToekenning>(`/maatregeltoekenningen/actief/${leerlingId}`)?.pipe(
            tap((maatregelen) =>
                ctx.patchState({
                    actieveMaatregelen: maatregelen.map(mapMaatregelToekenning) ?? []
                })
            )
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SMaatregelenState>) {
        ctx.setState(DEFAULT_STATE);
    }

    @Selector()
    static actieveMaatregelen(state: SMaatregelenState) {
        return state.actieveMaatregelen;
    }

    override getTimeout(): number {
        return CallService.MAATREGELEN_TIMEOUT;
    }
}
