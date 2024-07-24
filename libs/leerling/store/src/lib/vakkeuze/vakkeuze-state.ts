import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { format } from 'date-fns';
import { RVakkeuze } from 'leerling-codegen';
import { RequestInformationBuilder } from 'leerling-request';
import { tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState } from '../util/abstract-state';
import { RefreshVakken } from './vakkeuze-actions';
import { SVakkeuzeModel, createVakkeuzeModel } from './vakkeuze-model';

export const VAKKEUZE_STATE_TOKEN = new StateToken<SVakkeuzeModel>('vakkeuzes');
const DEFAULT_STATE: SVakkeuzeModel = { vakkeuzes: undefined };

export const vandaag = format(new Date(), 'yyyy-MM-dd');

@State<SVakkeuzeModel>({
    name: VAKKEUZE_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class VakkeuzeState extends AbstractState {
    @Action(RefreshVakken)
    refreshPlaatsing(ctx: StateContext<SVakkeuzeModel>) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        return this.cachedUnwrappedGet<RVakkeuze>(
            'vakkeuzes',
            new RequestInformationBuilder().parameter('actiefOpPeildatum', vandaag).leerling(leerlingID).build()
        )?.pipe(
            tap((vakken) => {
                ctx.setState(patch(createVakkeuzeModel(vakken)));
            })
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SVakkeuzeModel>) {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.VAKKEN_TIMEOUT;
    }
}
