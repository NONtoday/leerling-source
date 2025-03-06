import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { produce } from 'immer';
import { RBoodschap, RLeerlingInleveringDetails } from 'leerling-codegen';
import { RequestInformationBuilder } from 'leerling-request';
import { of, tap } from 'rxjs';
import { mapBoodschap } from '../bericht/bericht-model';
import { REFRESH_CONVERSATIES_PATH } from '../bericht/bericht-state';
import { CallService } from '../call/call.service';
import { UpdateInleveropdrachtStatus } from '../huiswerk/huiswerk-actions';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState } from '../util/abstract-state';
import { AccepteerEula, RefreshInleverDetails, VerstuurReactie, VerwijderInlevering } from './inleveropdracht-actions';
import { mapInleverDetails, SInleverModel } from './inleveropdracht-model';

export const INLEVEROPDRACHT_STATE_TOKEN = new StateToken<SInleverModel>('inleveropdracht');
const DEFAULT_STATE = { inleverDetails: undefined };

@State<SInleverModel>({
    name: INLEVEROPDRACHT_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class InleveropdrachtState extends AbstractState {
    @Action(RefreshInleverDetails)
    refreshInleverDetails(ctx: StateContext<SInleverModel>, action: RefreshInleverDetails) {
        if (!this.getLeerlingID()) {
            return;
        }

        return this.cachedGet<RLeerlingInleveringDetails>(
            `studiewijzeritemdagtoekenningen/inleverdetails/${action.toekenningId}`,
            undefined,
            { force: true }
        )?.pipe(
            tap((details) => {
                const mappedDetails = mapInleverDetails(details);
                ctx.setState(
                    produce(ctx.getState(), (draft) => {
                        const inleverDetails = draft.inleverDetails ?? {};
                        inleverDetails[action.toekenningId] = mappedDetails;
                        draft.inleverDetails = inleverDetails;
                    })
                );
                // Update de inleveropdracht in de huiswerk state met de juiste status
                ctx.dispatch(
                    new UpdateInleveropdrachtStatus(
                        action.toekenningId,
                        action.toekenningDatum,
                        mappedDetails.inleveringen[0],
                        mappedDetails.aantalInleveringenInVerwerking
                    )
                );
            })
        );
    }

    @Action(VerstuurReactie)
    vestuurReactie(ctx: StateContext<SInleverModel>, action: VerstuurReactie) {
        return this.requestService
            .post<RBoodschap>(
                `studiewijzeritemdagtoekenningen/${action.toekenningId}/verstuurReactieLeerling`,
                new RequestInformationBuilder().body(action.inhoud).build()
            )
            .pipe(
                tap((boodschap) => {
                    this._store.dispatch(new RefreshInleverDetails(action.toekenningId, action.toekenningDatum));
                    this._callService.markDirty(REFRESH_CONVERSATIES_PATH);

                    ctx.setState(
                        produce(ctx.getState(), (draft) => {
                            const inleverDetails = draft.inleverDetails ?? {};
                            inleverDetails[action.toekenningId].conversatie.unshift(mapBoodschap(boodschap));
                            draft.inleverDetails = inleverDetails;
                        })
                    );
                })
            );
    }

    @Action(VerwijderInlevering)
    verwijderInlevering(ctx: StateContext<SInleverModel>, action: VerwijderInlevering) {
        if (!this.getLeerlingID()) {
            return;
        }

        return this.requestService.deleteWithResponse(`studiewijzeritemdagtoekenningen/inlevering/${action.inleveringId}`)?.pipe(
            tap(() => {
                const details = ctx.getState().inleverDetails;
                if (!details) return;

                const toekenningDetails = details[action.toekenningId];
                if (!toekenningDetails) return;

                const inleveringen = toekenningDetails.inleveringen.filter((inlevering) => inlevering.id !== action.inleveringId);

                ctx.setState({
                    inleverDetails: {
                        ...details,
                        [action.toekenningId]: {
                            ...toekenningDetails,
                            inleveringen
                        }
                    }
                });

                // Update de inleveropdracht in de huiswerk state met de juiste status
                ctx.dispatch(
                    new UpdateInleveropdrachtStatus(
                        action.toekenningId,
                        action.toekenningDatum,
                        inleveringen[0],
                        toekenningDetails.aantalInleveringenInVerwerking
                    )
                );
            })
        );
    }

    @Action(AccepteerEula)
    accepteerEula() {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId || this.isOffline()) {
            return of();
        }

        return this.requestService.post<any>(
            'studiewijzeritemdagtoekenningen/inleveringen/accepteerLatestEULA',
            new RequestInformationBuilder().build()
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<any>): void {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.INLEVERDETAILS_TIMEOUT;
    }
}
