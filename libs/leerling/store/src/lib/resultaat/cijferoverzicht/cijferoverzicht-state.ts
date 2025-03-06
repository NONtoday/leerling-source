import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { RLeerlingVakExamenResultaten, RLeerlingVoortgangResultaten } from 'leerling-codegen';
import { DEFAULT_REQUEST_INFORMATION, RequestInformationBuilder } from 'leerling-request';
import { tap } from 'rxjs';
import { CallService } from '../../call/call.service';
import { AbstractState, insertOrUpdateItem } from '../../util/abstract-state';
import { RefreshExamenCijferoverzicht, RefreshVoortgangCijferoverzicht } from './cijferoverzicht-actions';
import {
    ADDITIONAL_TOETSSOORTAFKORTING,
    mapExamenVakExamenResultaten,
    mapVoortgangCijferoverzicht,
    SCijferOverzichtModel,
    SExamenCijferOverzicht
} from './cijferoverzicht-model';

export const CIJFER_OVERZICHT_STATE_TOKEN = new StateToken<SCijferOverzichtModel>('cijferoverzicht');
const DEFAULT_STATE: SCijferOverzichtModel = {
    voortgangOverzichten: [],
    examenOverzichten: []
};

@State<SCijferOverzichtModel>({
    name: CIJFER_OVERZICHT_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class CijferoverzichtState extends AbstractState {
    @Action(RefreshVoortgangCijferoverzicht)
    refreshVoortgangCijferoverzicht(ctx: StateContext<SCijferOverzichtModel>, action: RefreshVoortgangCijferoverzicht) {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }

        return this.cachedGet<RLeerlingVoortgangResultaten>(`geldendvoortgangsdossierresultaten/leerling/cijferoverzicht/${leerlingId}`, {
            ...DEFAULT_REQUEST_INFORMATION,
            queryParameters: {
                plaatsing: action.plaatsingUuid
            }
        })?.pipe(
            tap((resultaten) => {
                const mapped = mapVoortgangCijferoverzicht(action.plaatsingUuid, resultaten);
                ctx.setState(patch({ voortgangOverzichten: insertOrUpdateItem((item) => item.plaatsingUuid, mapped) }));
            })
        );
    }

    @Action(RefreshExamenCijferoverzicht)
    refreshExamenCijferoverzicht(ctx: StateContext<SCijferOverzichtModel>, action: RefreshExamenCijferoverzicht) {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }

        return this.cachedUnwrappedGet<RLeerlingVakExamenResultaten>(
            `geldendexamendossierresultaten/leerling/cijferoverzicht/${leerlingId}`,
            new RequestInformationBuilder()
                .parameter('plaatsing', action.plaatsingUuid)
                .parameter('lichting', action.lichtingUuid)
                .additionals(ADDITIONAL_TOETSSOORTAFKORTING)
                .build()
        )?.pipe(
            tap((vakResultatenLijst) => {
                const examenOverzicht: SExamenCijferOverzicht = {
                    plaatsingUuid: action.plaatsingUuid,
                    lichtingUuid: action.lichtingUuid,
                    examenVakResultaten: vakResultatenLijst
                        .map((vakResultaten) => mapExamenVakExamenResultaten(vakResultaten))
                        .filter((vakResultaten) => !!vakResultaten)
                };
                ctx.setState(
                    patch({
                        examenOverzichten: insertOrUpdateItem((item) => item.plaatsingUuid + ' - ' + item.lichtingUuid, examenOverzicht)
                    })
                );
            })
        );
    }

    override getTimeout(): number {
        return CallService.RESULTATEN_TIMEOUT;
    }

    override switchContext(ctx: StateContext<any>): void {
        ctx.setState(DEFAULT_STATE);
    }
}
