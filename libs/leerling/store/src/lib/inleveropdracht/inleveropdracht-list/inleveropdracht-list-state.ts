import { HttpStatusCode } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch, updateItem } from '@ngxs/store/operators';
import { isPresent } from 'harmony';
import { produce } from 'immer';
import { RLeerlingPrimer, RswiDagToekenning, RswiToekenning } from 'leerling-codegen';
import { RequestInformationBuilder } from 'leerling-request';
import { orderBy } from 'lodash-es';
import { tap } from 'rxjs';
import { CallService } from '../../call/call.service';
import {
    ADDITIONAL_GEMAAKT,
    ADDITIONAL_LEERLING_PROJECTGROEP,
    ADDITIONAL_LEERLINGEN,
    ADDITIONAL_LEERLINGEN_MET_INLEVERING_STATUS,
    ADDITIONAL_LESGROEP,
    ADDITIONAL_STUDIEWIJZER_ID,
    mapDatumStudiewijzerItem,
    SStudiewijzerItem
} from '../../huiswerk/huiswerk-model';
import { SwitchContext } from '../../shared/shared-actions';
import { AbstractState } from '../../util/abstract-state';
import { getEntiteitId } from '../../util/entiteit-model';
import { RefreshInleverOpdrachtList, ToggleInleverOpdrachtAfgevinkt } from './inleveropdracht-list-actions';
import { SInleverOpdrachtenModel } from './inleveropdracht-list-model';

export const INLEVEROPDRACHT_LIST_STATE_TOKEN = new StateToken<SInleverOpdrachtenModel>('inleveropdrachtlist');
const DEFAULT_STATE = { inleverOpdrachten: undefined };

@State<SInleverOpdrachtenModel>({
    name: INLEVEROPDRACHT_LIST_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class InleveropdrachtListState extends AbstractState {
    @Action(RefreshInleverOpdrachtList)
    RefreshInleverOpdrachten(ctx: StateContext<SInleverOpdrachtenModel>) {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }
        return this.cachedUnwrappedGet<RswiDagToekenning>(
            'studiewijzeritemdagtoekenningen',
            new RequestInformationBuilder()
                .parameter('geenDifferentiatieOfGedifferentieerdVoorLeerling', leerlingId)
                .parameter('studiewijzerItem.heeftInleverperiode', true)
                .additionals(
                    ADDITIONAL_LEERLINGEN,
                    ADDITIONAL_GEMAAKT,
                    ADDITIONAL_LESGROEP,
                    ADDITIONAL_LEERLINGEN_MET_INLEVERING_STATUS,
                    ADDITIONAL_LEERLING_PROJECTGROEP,
                    ADDITIONAL_STUDIEWIJZER_ID
                )
                .ignoreStatusCodes(HttpStatusCode.Forbidden)
                .build(),
            { force: true }
        )?.pipe(
            tap((response) => {
                const toekenningVoorSpecifiekeLeerling = (toekenning: RswiToekenning): boolean =>
                    toekenning.studiewijzerItem &&
                    toekenning.additionalObjects?.[ADDITIONAL_LEERLINGEN]?.items.find(
                        (leerling: RLeerlingPrimer) => getEntiteitId(leerling) === leerlingId
                    );

                const inleverOpdrachten = response
                    .filter(toekenningVoorSpecifiekeLeerling)
                    .map((dagToekenning) => mapDatumStudiewijzerItem(leerlingId, 'DAG', dagToekenning))
                    .filter(isPresent);

                ctx.setState(
                    produce((draft) => {
                        const inleveropdrachten = draft.inleverOpdrachten ?? [];
                        inleverOpdrachten.forEach((newOpdracht) => {
                            const index = inleveropdrachten.findIndex((opdracht) => opdracht.id === newOpdracht.id);
                            if (index >= 0) {
                                inleveropdrachten[index] = newOpdracht;
                            } else {
                                inleveropdrachten.push(newOpdracht);
                            }
                        });

                        draft.inleverOpdrachten = orderBy(inleveropdrachten, ['inlevermoment.eind'], ['asc']);
                    })
                );
            })
        );
    }

    @Action(ToggleInleverOpdrachtAfgevinkt)
    ToggleInleverOpdrachtAfgevinkt(ctx: StateContext<SInleverOpdrachtenModel>, action: ToggleInleverOpdrachtAfgevinkt) {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId || !ctx.getState().inleverOpdrachten) return;

        ctx.setState(
            patch({
                inleverOpdrachten: updateItem<SStudiewijzerItem>((item) => item.id === action.item.id, patch({ gemaakt: action.gemaakt }))
            })
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<any>): void {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.INLEVEROPDRACHT_TIMEOUT;
    }
}
