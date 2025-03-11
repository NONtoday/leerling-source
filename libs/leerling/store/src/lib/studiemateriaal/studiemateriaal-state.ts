import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { REduRoutePortalUserProduct, RStudieMateriaal } from 'leerling-codegen';
import { DEFAULT_REQUEST_INFORMATION } from 'leerling-request';
import { tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState, insertOrUpdateItem } from '../util/abstract-state';
import { mapVak } from '../vakkeuze/vakkeuze-model';
import { RefreshEduRoutePortalProducts, RefreshStudiemateriaal, RefreshVakkenMetStudiemateriaal } from './studiemateriaal-actions';
import { SStudiemateriaalModel, mapEduRoutePortalUserProducts, mapStudiemateriaal } from './studiemateriaal-model';

export const STUDIEMATERIAAL_STATE_TOKEN = new StateToken<SStudiemateriaalModel>('studiemateriaal');
const DEFAULT_STATE: SStudiemateriaalModel = {
    studiemateriaal: undefined,
    eduRoutePortalProducts: undefined,
    vakkenMetStudiemateriaal: undefined
};

@State<SStudiemateriaalModel>({
    name: STUDIEMATERIAAL_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class StudiemateriaalState extends AbstractState {
    @Action(RefreshEduRoutePortalProducts)
    refreshEduRoutePortalProducts(ctx: StateContext<SStudiemateriaalModel>, action: RefreshEduRoutePortalProducts) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        // Verzorger mag geen leermiddelen ophalen: we geven hem een lege state.
        if (!action.isLeerling) {
            if (ctx.getState().eduRoutePortalProducts === undefined) {
                ctx.setState(patch({ eduRoutePortalProducts: [] }));
            }
            return;
        }

        return this.cachedUnwrappedGet<REduRoutePortalUserProduct>(`studiemateriaal/algemeen/${leerlingID}`, DEFAULT_REQUEST_INFORMATION, {
            customTimeout: CallService.EDUROUTEPORTAL_TIMEOUT
        })?.pipe(
            tap((rUserProducts) => {
                const sUserProducts = rUserProducts.map((userProduct) => mapEduRoutePortalUserProducts(userProduct));
                ctx.setState(patch({ eduRoutePortalProducts: sUserProducts }));
            })
        );
    }

    @Action(RefreshStudiemateriaal)
    refreshStudiemateriaal(ctx: StateContext<SStudiemateriaalModel>, action: RefreshStudiemateriaal) {
        if (!action.vakUuid && !action.lesgroepUuid) return;

        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        const uuid = action.vakUuid ?? action.lesgroepUuid ?? '';
        const method = action.vakUuid ? 'vak' : 'lesgroep';
        return this.cachedGet<RStudieMateriaal>(`studiemateriaal/${leerlingID}/${method}/${uuid}`)?.pipe(
            tap((rStudiemateriaal) => {
                const sStudiemateriaal = mapStudiemateriaal(uuid, rStudiemateriaal);
                if (ctx.getState().studiemateriaal) {
                    ctx.setState(patch({ studiemateriaal: insertOrUpdateItem((item) => item.vakOfLesgroepUuid, sStudiemateriaal) }));
                } else {
                    ctx.setState(patch({ studiemateriaal: [sStudiemateriaal] }));
                }
            })
        );
    }

    @Action(RefreshVakkenMetStudiemateriaal)
    refreshVakkenMetStudiemateriaal(ctx: StateContext<SStudiemateriaalModel>) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        return this.cachedUnwrappedGet<REduRoutePortalUserProduct>(`vakken/studiemateriaal/${leerlingID}`)?.pipe(
            tap((rVakken) => {
                const sVakken = rVakken.map((vak) => mapVak(vak));
                ctx.setState(patch({ vakkenMetStudiemateriaal: sVakken }));
            })
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SStudiemateriaalModel>) {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.STUDIEMATERIAAL_TIMEOUT;
    }
}
