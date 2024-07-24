import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { RVakantie } from 'leerling-codegen';
import { tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState } from '../util/abstract-state';
import { RefreshVakantie } from './vakantie-actions';
import { SVakantieModel, createVakantieModel } from './vakantie-model';

export const VAKANTIE_STATE_TOKEN = new StateToken<SVakantieModel>('vakanties');
const DEFAULT_STATE: SVakantieModel = { vakanties: [] };

@State<SVakantieModel>({
    name: VAKANTIE_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class VakantieState extends AbstractState {
    @Action(RefreshVakantie)
    refreshVakantie(ctx: StateContext<SVakantieModel>) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        return this.cachedUnwrappedGet<RVakantie>('vakanties/leerling/' + leerlingID)?.pipe(
            tap((vakanties) => ctx.setState(patch(createVakantieModel(vakanties))))
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SVakantieModel>) {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.VAKANTIE_TIMEOUT;
    }
}
