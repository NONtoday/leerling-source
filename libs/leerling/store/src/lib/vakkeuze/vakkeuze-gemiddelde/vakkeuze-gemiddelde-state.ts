import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { RLeerlingVakGemiddelden } from 'leerling-codegen';
import { tap } from 'rxjs';
import { CallService } from '../../call/call.service';
import { SwitchContext } from '../../shared/shared-actions';
import { AbstractState, insertOrUpdateItem } from '../../util/abstract-state';
import { RefreshVakkeuzeMetGemiddelden } from './vakkeuze-gemiddelde-actions';
import { SVakkeuzeGemiddeldeModel, SVakkeuzeGemiddelden, mapVakGemiddelden } from './vakkeuze-gemiddelde-model';

const VAKKEUZE_GEMIDDELDE_STATE_TOKEN = new StateToken<SVakkeuzeGemiddeldeModel>('vakkeuzegemiddelde');
const DEFAULT_STATE: SVakkeuzeGemiddeldeModel = {
    vakkeuzeGemiddelden: undefined
};

@State<SVakkeuzeGemiddeldeModel>({
    name: VAKKEUZE_GEMIDDELDE_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class VakkeuzeGemiddeldeState extends AbstractState {
    @Action(RefreshVakkeuzeMetGemiddelden)
    refreshVakkeuzeMetGemiddelden(ctx: StateContext<SVakkeuzeGemiddeldeModel>, action: RefreshVakkeuzeMetGemiddelden) {
        return this.cachedGet<RLeerlingVakGemiddelden>(`vakkeuzes/plaatsing/${action.plaatsingUuid}/vakgemiddelden`)?.pipe(
            tap((vakgemiddelden) => {
                if (ctx.getState().vakkeuzeGemiddelden) {
                    ctx.setState(
                        patch({
                            vakkeuzeGemiddelden: insertOrUpdateItem(
                                (item: SVakkeuzeGemiddelden) => item.plaatsingUuid,
                                mapVakGemiddelden(vakgemiddelden, action.plaatsingUuid)
                            )
                        })
                    );
                } else {
                    ctx.setState({
                        vakkeuzeGemiddelden: [mapVakGemiddelden(vakgemiddelden, action.plaatsingUuid)]
                    });
                }
            })
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SVakkeuzeGemiddeldeModel>) {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.VAKKEUZE_GEMIDDELDE_TIMEOUT;
    }
}
