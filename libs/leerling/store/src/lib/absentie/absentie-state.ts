import { HttpStatusCode } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext, StateToken } from '@ngxs/store';
import { RAbsentieMeldingInvoer, RAbsentieReden } from 'leerling-codegen';
import { RequestInformationBuilder } from 'leerling-request';
import { map, tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState } from '../util/abstract-state';
import { RefreshAbsentieRedenen, VerstuurAbsentieMelding } from './absentie-actions';
import { SAbsentieState, mapAbsentieReden, mapRAbstentieMeldingInvoer } from './absentie-model';

export const ABSENTIE_STATE_TOKEN = new StateToken<SAbsentieState>('absentie');

const DEFAULT_STATE: SAbsentieState = { absentieRedenen: undefined };

@State<SAbsentieState>({
    name: ABSENTIE_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class AbsentieState extends AbstractState {
    @Action(RefreshAbsentieRedenen)
    refreshAbsentieRedenen(ctx: StateContext<SAbsentieState>, action: RefreshAbsentieRedenen) {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId || !action.vestigingId) {
            return;
        }

        return this.cachedUnwrappedGet<RAbsentieReden>(
            'absentieredenen',
            new RequestInformationBuilder().parameter('vestiging', action.vestigingId).leerling(leerlingId).build()
        )?.pipe(
            map((redenen) => redenen.map(mapAbsentieReden)),
            tap((redenen) => {
                ctx.patchState({ absentieRedenen: redenen });
            })
        );
    }

    @Action(VerstuurAbsentieMelding)
    verstuurAbsentieMelding(ctx: StateContext<SAbsentieState>, action: VerstuurAbsentieMelding) {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }
        const rAbsentieMeldingInvoer = mapRAbstentieMeldingInvoer(action.absentieMeldingInvoer, leerlingId);
        return this.requestService.post<RAbsentieMeldingInvoer>(
            'absentiemeldingen',
            new RequestInformationBuilder()
                .body({
                    items: [
                        {
                            ...rAbsentieMeldingInvoer,
                            $type: 'participatie.RAbsentieMeldingInvoer'
                        }
                    ]
                })
                .leerling(leerlingId)
                .skipErrorMessageStatusCodes(HttpStatusCode.BadRequest)
                .build()
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SAbsentieState>) {
        ctx.setState(DEFAULT_STATE);
    }
    override getTimeout(): number {
        return CallService.ABSENTIE_TIMEOUT;
    }

    @Selector()
    static absentieRedenen(state: SAbsentieState) {
        return state.absentieRedenen;
    }
}
