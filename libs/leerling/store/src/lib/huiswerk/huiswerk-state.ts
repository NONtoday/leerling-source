import { HttpStatusCode } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { isSameDay } from 'date-fns';
import { RswiAfspraakToekenning, RswiDagToekenning, RswiGemaakt, RswiWeekToekenning } from 'leerling-codegen';
import { RequestInformation, RequestInformationBuilder } from 'leerling-request';
import { isEqual } from 'lodash-es';
import { forkJoin, tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { ToggleInleverOpdrachtAfgevinkt } from '../inleveropdracht/inleveropdracht-list/inleveropdracht-list-actions';
import { IncomingPushAction } from '../pushaction/pushaction-actions';
import { AvailablePushType } from '../pushaction/pushaction-model';
import { RechtenSelectors } from '../rechten/rechten-selectors';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState, insertOrUpdateItem } from '../util/abstract-state';
import { getJaarWeek } from '../util/date-util';
import { createLinks } from '../util/entiteit-model';
import { RefreshHuiswerk, ToggleAfgevinkt, UpdateInleveropdrachtStatus } from './huiswerk-actions';
import {
    ADDITIONAL_GEMAAKT,
    ADDITIONAL_LEERLINGEN,
    ADDITIONAL_LEERLINGEN_MET_INLEVERING_STATUS,
    ADDITIONAL_LEERLING_PROJECTGROEP,
    ADDITIONAL_LESGROEP,
    ADDITIONAL_STUDIEWIJZER_ID,
    SSWIModel,
    SSWIWeek,
    SStudiewijzerItem,
    createSWIWeek,
    getInleveropdrachtCategorie
} from './huiswerk-model';

const STATE_NAME = 'huiswerk';
export const HUISWERK_STATE_TOKEN = new StateToken<SSWIModel>(STATE_NAME);
const DEFAULT_STATE = { jaarWeken: undefined };

@State<SSWIModel>({
    name: HUISWERK_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class HuiswerkState extends AbstractState {
    @Action(RefreshHuiswerk)
    refreshHuiswerk(ctx: StateContext<SSWIModel>, action: RefreshHuiswerk) {
        const leerlingId: number | undefined = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }

        if (!this._store.selectSnapshot(RechtenSelectors.heeftRecht('huiswerkBekijkenAan'))) {
            this._setOrUpdateSwiWeek(ctx, createSWIWeek(action.jaarWeek, leerlingId, [], [], []));
            return;
        }

        // Als er nog geen enkele studiewijzer is (bv begin van het schooljaar), krijgen we een 403 terug.
        const datumRequestInfo = this._buildHuiswerkRequest(leerlingId, 'jaarWeek', action.jaarWeek);
        const weekRequestInfo = this._buildHuiswerkRequest(leerlingId, 'weeknummer', action.jaarWeek.split('~')[1]);

        const isStillFresh = this.isFresh(
            this.createCallDefinition('studiewijzeritemafspraaktoekenningen', this.getTimeout(), datumRequestInfo),
            this.createCallDefinition('studiewijzeritemdagtoekenningen', this.getTimeout(), datumRequestInfo),
            this.createCallDefinition('studiewijzeritemweektoekenningen', this.getTimeout(), weekRequestInfo)
        );

        if (isStillFresh && !action.requestOptions.forceRequest) {
            return;
        }

        const afspraakToekenningenRequest = this.cachedUnwrappedGet<RswiAfspraakToekenning>(
            'studiewijzeritemafspraaktoekenningen',
            datumRequestInfo,
            { force: true }
        );
        const dagToekenningenRequest = this.cachedUnwrappedGet<RswiDagToekenning>('studiewijzeritemdagtoekenningen', datumRequestInfo, {
            force: true
        });
        const weekToekenningenRequest = this.cachedUnwrappedGet<RswiWeekToekenning>('studiewijzeritemweektoekenningen', weekRequestInfo, {
            force: true
        });

        if (!afspraakToekenningenRequest || !dagToekenningenRequest || !weekToekenningenRequest) {
            return;
        }

        return forkJoin([afspraakToekenningenRequest, dagToekenningenRequest, weekToekenningenRequest]).pipe(
            tap(([afspraakToekenningen, dagToekenningen, weekToekenningen]) => {
                const swiWeek = createSWIWeek(action.jaarWeek, leerlingId, afspraakToekenningen, dagToekenningen, weekToekenningen);
                this._setOrUpdateSwiWeek(ctx, swiWeek);
            })
        );
    }

    @Action(UpdateInleveropdrachtStatus)
    updateInleveropdrachtStatus(ctx: StateContext<SSWIModel>, action: UpdateInleveropdrachtStatus) {
        const state = ctx.getState();
        const jaarWeek = getJaarWeek(action.datum);
        let shouldUpdate = false;
        const updatedJaarWeken = state.jaarWeken?.map((week) => {
            if (week.jaarWeek !== jaarWeek) return week;

            const updatedDagen = week.dagen?.map((dag) => {
                if (!isSameDay(dag.datum, action.datum)) return dag;

                return {
                    ...dag,
                    items: dag.items?.map((item) => {
                        if (item.toekenningId !== action.toekenningId) return item;

                        const ongewijzigd =
                            isEqual(item.laatsteInleveringDatum, action.inlevering?.verzendDatum) &&
                            isEqual(item.laatsteInleveringStatus, action.inlevering?.status);
                        if (ongewijzigd) return item;

                        const updatedItem = {
                            ...item,
                            laatsteInleveringStatus: action.inlevering?.status,
                            laatsteInleveringDatum: action.inlevering?.verzendDatum
                        };
                        const updatedInleveropdrachtCategorie = getInleveropdrachtCategorie(
                            updatedItem,
                            action.aantalInleveringenInVerwerking
                        );
                        shouldUpdate = item.inleveropdrachtCategorie !== updatedInleveropdrachtCategorie;
                        return {
                            ...updatedItem,
                            inleveropdrachtCategorie: updatedInleveropdrachtCategorie
                        };
                    })
                };
            });

            return { ...week, dagen: updatedDagen };
        });

        if (shouldUpdate) {
            ctx.patchState({
                jaarWeken: updatedJaarWeken
            });
        }
    }

    private _buildHuiswerkRequest(leerlingId: number, weerkParamNaam: string, weekParamValue: any): RequestInformation {
        return new RequestInformationBuilder()
            .parameter('geenDifferentiatieOfGedifferentieerdVoorLeerling', leerlingId)
            .parameter(weerkParamNaam, weekParamValue)
            .additionals(
                ADDITIONAL_LEERLINGEN,
                ADDITIONAL_GEMAAKT,
                ADDITIONAL_LESGROEP,
                ADDITIONAL_LEERLINGEN_MET_INLEVERING_STATUS,
                ADDITIONAL_LEERLING_PROJECTGROEP,
                ADDITIONAL_STUDIEWIJZER_ID
            )
            .ignoreStatusCodes(HttpStatusCode.Forbidden)
            .build();
    }

    private _setOrUpdateSwiWeek(ctx: StateContext<SSWIModel>, swiWeek: SSWIWeek) {
        const state = ctx.getState();
        if (state.jaarWeken) {
            ctx.setState(patch({ jaarWeken: insertOrUpdateItem((item) => item.jaarWeek, swiWeek) }));
        } else {
            ctx.setState({
                jaarWeken: [swiWeek]
            });
        }
    }

    @Action(ToggleAfgevinkt)
    toggleAfgevinkt(ctx: StateContext<SSWIModel>, action: ToggleAfgevinkt) {
        const leerlingId: number | undefined = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }

        const gemaakt: RswiGemaakt = {
            leerling: {
                links: createLinks(leerlingId, 'leerling.RLeerlingPrimer')
            },
            swiToekenningId: action.item.toekenningId,
            gemaakt: !action.item.gemaakt
        };

        return this.requestService.put<RswiGemaakt>('swigemaakt/cou', new RequestInformationBuilder().body(gemaakt).build()).pipe(
            tap((result) => {
                const mapItem = (item: SStudiewijzerItem) =>
                    item.toekenningId === action.item.toekenningId ? { ...item, gemaakt: Boolean(result.gemaakt) } : item;
                const weken = ctx.getState().jaarWeken?.map((week) => ({
                    ...week,
                    weekitems: week.weekitems.map(mapItem),
                    dagen: week.dagen.map((dag) => {
                        return {
                            ...dag,
                            items: dag.items.map(mapItem)
                        };
                    })
                }));
                this._store.dispatch(new ToggleInleverOpdrachtAfgevinkt(action.item, Boolean(result.gemaakt)));
                ctx.setState(patch({ jaarWeken: weken }));
            })
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SSWIModel>, action: SwitchContext) {
        if (!action.initialContextSwitch) {
            ctx.setState(DEFAULT_STATE);
        }
    }

    @Action(IncomingPushAction)
    incomingPushAction(ctx: StateContext<SSWIModel>, action: IncomingPushAction) {
        if (action.type === AvailablePushType.INLEVERPERIODEBERICHT && action.datum) {
            ctx.dispatch(new RefreshHuiswerk(getJaarWeek(action.datum), { forceRequest: true }));
        }
    }

    override getTimeout(): number {
        return CallService.SWI_TIMEOUT;
    }

    public static getName() {
        return STATE_NAME;
    }
}
