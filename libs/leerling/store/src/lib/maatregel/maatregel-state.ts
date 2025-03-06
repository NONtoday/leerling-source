import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext, StateToken, createSelector } from '@ngxs/store';
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns';
import { RMaatregelToekenning } from 'leerling-codegen';
import { DEFAULT_REQUEST_INFORMATION } from 'leerling-request';
import { orderBy } from 'lodash-es';
import { tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { IncomingPushAction } from '../pushaction/pushaction-actions';
import { AvailablePushType } from '../pushaction/pushaction-model';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState, Callproperties } from '../util/abstract-state';
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
    refreshMaatregelen(ctx: StateContext<SMaatregelenState>, action: RefreshMaatregelen) {
        const leerlingId: number | undefined = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }

        const callProperties: Callproperties = {};
        if (action.requestOptions.forceRequest) {
            callProperties.force = true;
        }
        return this.cachedUnwrappedGet<RMaatregelToekenning>(
            `/maatregeltoekenningen/actief/${leerlingId}`,
            DEFAULT_REQUEST_INFORMATION,
            callProperties
        )?.pipe(
            tap((maatregelen) =>
                ctx.patchState({
                    actieveMaatregelen: orderBy(maatregelen.map(mapMaatregelToekenning), (mt) => mt.maatregelDatum, 'desc') ?? []
                })
            )
        );
    }

    @Action(IncomingPushAction)
    incomingPushAction(ctx: StateContext<SMaatregelenState>, action: IncomingPushAction) {
        if (action.type === AvailablePushType.AFWEZIGHEID) {
            ctx.dispatch(new RefreshMaatregelen({ forceRequest: true }));
        }
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SMaatregelenState>) {
        ctx.setState(DEFAULT_STATE);
    }

    @Selector()
    static actieveMaatregelen(state: SMaatregelenState) {
        return state.actieveMaatregelen;
    }

    static actieveMaatregelenPeriode(begindatum: Date, einddatum: Date) {
        return createSelector([this.actieveMaatregelen], (maatregelen) =>
            maatregelen?.filter((maatregel) =>
                isWithinInterval(maatregel.maatregelDatum, { start: startOfDay(begindatum), end: endOfDay(einddatum) })
            )
        );
    }

    override getTimeout(): number {
        return CallService.MAATREGELEN_TIMEOUT;
    }
}
