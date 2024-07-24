import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { produce } from 'immer';
import { RGeldendExamendossierResultaat, RGeldendVoortgangsdossierResultaat } from 'leerling-codegen';
import { tap } from 'rxjs';
import { CallService } from '../../call/call.service';
import { SwitchContext } from '../../shared/shared-actions';
import { AbstractState } from '../../util/abstract-state';
import { getEntiteitId } from '../../util/entiteit-model';
import {
    GetExamendossierSamengesteldeToetsDetails,
    GetVoortgangsdossierSamengesteldeToetsDetails
} from './samengesteldetoets-details-actions';
import { SSamengesteldeToetsModel } from './samengesteldetoets-details-model';

export const SAMENGESTELDETOETS_DETAILS_STATE_TOKEN = new StateToken<SSamengesteldeToetsModel>('samengesteldetoetsdetails');
const DEFAULT_STATE = { samengesteldeToetsen: undefined };

@State<SSamengesteldeToetsModel>({
    name: SAMENGESTELDETOETS_DETAILS_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class SamengesteldeToetsDetailsState extends AbstractState {
    @Action(GetVoortgangsdossierSamengesteldeToetsDetails)
    getVoortgangsdossierSamengesteldeToetsDetails(
        ctx: StateContext<SSamengesteldeToetsModel>,
        action: GetVoortgangsdossierSamengesteldeToetsDetails
    ) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        return this.cachedUnwrappedGet<RGeldendVoortgangsdossierResultaat>(
            `geldendvoortgangsdossierresultaten/leerling/${leerlingID}/samengesteldetoets/${action.deeltoetsId}`
        )?.pipe(
            tap((resultaten) => {
                if (resultaten.length > 0) {
                    const rGeldendResultaat = resultaten[0];

                    ctx.setState(
                        produce(ctx.getState(), (draft) => {
                            const samengesteldeToetsen = draft.samengesteldeToetsen ?? {};
                            samengesteldeToetsen[action.deeltoetsId] = {
                                id: getEntiteitId(rGeldendResultaat),
                                omschrijving: rGeldendResultaat.omschrijving ?? '',
                                formattedResultaat: rGeldendResultaat.formattedResultaat ?? '',
                                formattedResultaatAlternatief: rGeldendResultaat.formattedResultaatAlternatief ?? '',
                                isOnvoldoende: rGeldendResultaat.isVoldoende === false,
                                isOnvoldoendeAlternatief: rGeldendResultaat.isVoldoendeAlternatief === false
                            };
                            draft.samengesteldeToetsen = samengesteldeToetsen;
                        })
                    );
                }
            })
        );
    }

    @Action(GetExamendossierSamengesteldeToetsDetails)
    getExamendossierSamengesteldeToetsDetails(
        ctx: StateContext<SSamengesteldeToetsModel>,
        action: GetExamendossierSamengesteldeToetsDetails
    ) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        return this.cachedUnwrappedGet<RGeldendExamendossierResultaat>(
            `geldendexamendossierresultaten/leerling/${leerlingID}/samengesteldetoets/${action.deeltoetsId}`
        )?.pipe(
            tap((resultaten) => {
                if (resultaten.length > 0) {
                    const rGeldendResultaat = resultaten[0];
                    ctx.setState(
                        produce(ctx.getState(), (draft) => {
                            const samengesteldeToetsen = draft.samengesteldeToetsen ?? {};
                            samengesteldeToetsen[action.deeltoetsId] = {
                                id: getEntiteitId(rGeldendResultaat),
                                omschrijving: rGeldendResultaat.omschrijving ?? '',
                                formattedResultaat: rGeldendResultaat.formattedResultaat ?? '',
                                isOnvoldoende: rGeldendResultaat.isVoldoende === false
                            };
                            draft.samengesteldeToetsen = samengesteldeToetsen;
                        })
                    );
                }
            })
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<any>): void {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.RESULTATEN_TIMEOUT;
    }
}
