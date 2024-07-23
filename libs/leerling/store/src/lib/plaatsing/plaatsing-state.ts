import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { RLeerlingSchoolgegevens, RPlaatsing } from 'leerling-codegen';
import { RequestInformationBuilder } from 'leerling-request';
import { tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState } from '../util/abstract-state';
import { RefreshPlaatsing, RefreshSchoolgegevens } from './plaatsing-actions';
import { SPlaatsingModel, createPlaatsingModel, mapSchoolgegevens } from './plaatsing-model';

export const PLAATSING_STATE_TOKEN = new StateToken<SPlaatsingModel>('plaatsingen');
const DEFAULT_STATE: SPlaatsingModel = { plaatsingen: undefined, schoolgegevens: undefined };

@State<SPlaatsingModel>({
    name: PLAATSING_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class PlaatsingState extends AbstractState {
    @Action(RefreshPlaatsing)
    refreshPlaatsing(ctx: StateContext<SPlaatsingModel>) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        return this.cachedUnwrappedGet<RPlaatsing>('plaatsingen', new RequestInformationBuilder().leerling(leerlingID).build())?.pipe(
            tap((plaatsingen) => ctx.setState(patch(createPlaatsingModel(plaatsingen, ctx.getState()))))
        );
    }

    @Action(RefreshSchoolgegevens)
    refreshSchoolgegevens(ctx: StateContext<SPlaatsingModel>) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        return this.cachedGet<RLeerlingSchoolgegevens>('leerlingen/' + leerlingID + '/schoolgegevens')?.pipe(
            tap((schoolgegevens) => ctx.setState(patch({ schoolgegevens: mapSchoolgegevens(schoolgegevens) })))
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SPlaatsingModel>) {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.PLAATSING_TIMEOUT;
    }
}
