import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { produce } from 'immer';
import { RGeldendResultaat, RGeldendVoortgangsdossierResultaat } from 'leerling-codegen';
import { RequestInformation, RequestInformationBuilder } from 'leerling-request';
import { forkJoin, tap } from 'rxjs';
import { CallService } from '../../call/call.service';
import { SwitchContext } from '../../shared/shared-actions';
import { AbstractState } from '../../util/abstract-state';
import {
    ADDITIONAL_NAAM_ALTERNATIEF_NIVEAU,
    ADDITIONAL_NAAM_STANDAARD_NIVEAU,
    ADDITIONAL_RESULTAATKOLOM,
    ADDITIONAL_VAKNAAM,
    createGeldendExamendossierResultaten,
    createGeldendVoortgangsdossierResultaten
} from '../geldendresultaat-model';
import { GetExamendossierDeeltoetsen, GetVoortgangsdossierDeeltoetsen, RefreshVakResultaat } from './vakresultaat-actions';
import { SVakResultaatModel, createVakResultaatKey } from './vakresultaat-model';

export const VAK_RESULTAAT_STATE_TOKEN = new StateToken<SVakResultaatModel>('vakResultaat');
const DEFAULT_STATE = {
    geldendVoortgangsResultaten: undefined,
    geldendExamenResultaten: undefined,
    voortgangsdossierDeeltoetsen: undefined,
    examendossierDeeltoetsen: undefined
};

@State<SVakResultaatModel>({
    name: VAK_RESULTAAT_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class VakResultaatState extends AbstractState {
    @Action(RefreshVakResultaat)
    refreshVakResultaat(ctx: StateContext<SVakResultaatModel>, action: RefreshVakResultaat) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        const key = createVakResultaatKey(action.vakUuid, action.lichtingUuid, action.plaatsingUuid);

        const isStillFresh = this.isFresh(
            this.createCallDefinition(
                `/geldendvoortgangsdossierresultaten/vakresultaten/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
                this.getTimeout(),
                this.createResultaatRequestInfo(action.plaatsingUuid)
            ),
            this.createCallDefinition(
                `/geldendexamendossierresultaten/vakresultaten/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
                this.getTimeout(),
                this.createResultaatRequestInfo(action.plaatsingUuid)
            )
        );

        if (isStillFresh) {
            return;
        }

        const voortgangRequest = this.cachedUnwrappedGet<RGeldendVoortgangsdossierResultaat>(
            `/geldendvoortgangsdossierresultaten/vakresultaten/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
            this.createResultaatRequestInfo(action.plaatsingUuid),
            { force: true }
        );

        const examenRequest = this.cachedUnwrappedGet<RGeldendResultaat>(
            `/geldendexamendossierresultaten/vakresultaten/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
            this.createResultaatRequestInfo(action.plaatsingUuid),
            { force: true }
        );

        if (!voortgangRequest || !examenRequest) {
            return;
        }

        return forkJoin([voortgangRequest, examenRequest]).pipe(
            tap(([voortgangsResultaten, examenResultaten]) => {
                ctx.setState(
                    produce(ctx.getState(), (draft) => {
                        const geldendVoortgangsResultaten = draft.geldendVoortgangsResultaten ?? {};
                        geldendVoortgangsResultaten[key] = {
                            vakUuid: action.vakUuid,
                            lichtingUuid: action.lichtingUuid,
                            plaatsingUuid: action.plaatsingUuid,
                            geldendVoortgangsResultaten: createGeldendVoortgangsdossierResultaten(voortgangsResultaten)
                        };
                        draft.geldendVoortgangsResultaten = geldendVoortgangsResultaten;

                        const geldendExamenResultaten = draft.geldendExamenResultaten ?? {};
                        geldendExamenResultaten[key] = {
                            vakUuid: action.vakUuid,
                            lichtingUuid: action.lichtingUuid,
                            plaatsingUuid: action.plaatsingUuid,
                            geldendExamenResultaten: createGeldendExamendossierResultaten(examenResultaten)
                        };
                        draft.geldendExamenResultaten = geldendExamenResultaten;
                    })
                );
            })
        );
    }

    @Action(GetVoortgangsdossierDeeltoetsen)
    getVoortgangsdossierDeeltoetsen(ctx: StateContext<SVakResultaatModel>, action: GetVoortgangsdossierDeeltoetsen) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        return this.cachedUnwrappedGet(
            `/geldendvoortgangsdossierresultaten/leerling/${leerlingID}/deeltoetsen/${action.samengesteldeToetsId}`,
            new RequestInformationBuilder().parameter('plaatsingUuid', action.plaatsingUuid).build()
        )?.pipe(
            tap((deeltoetsen) => {
                ctx.setState(
                    produce(ctx.getState(), (draft) => {
                        const voortgangsdossierDeeltoetsen = draft.voortgangsdossierDeeltoetsen ?? {};
                        voortgangsdossierDeeltoetsen[action.samengesteldeToetsId] = createGeldendVoortgangsdossierResultaten(deeltoetsen);
                        draft.voortgangsdossierDeeltoetsen = voortgangsdossierDeeltoetsen;
                    })
                );
            })
        );
    }

    @Action(GetExamendossierDeeltoetsen)
    getExamendossierDeeltoetsen(ctx: StateContext<SVakResultaatModel>, action: GetVoortgangsdossierDeeltoetsen) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        return this.cachedUnwrappedGet(
            `/geldendexamendossierresultaten/leerling/${leerlingID}/deeltoetsen/${action.samengesteldeToetsId}`,
            new RequestInformationBuilder().parameter('plaatsingUuid', action.plaatsingUuid).build()
        )?.pipe(
            tap((deeltoetsen) => {
                ctx.setState(
                    produce(ctx.getState(), (draft) => {
                        const examendossierDeeltoetsen = draft.examendossierDeeltoetsen ?? {};
                        examendossierDeeltoetsen[action.samengesteldeToetsId] = createGeldendExamendossierResultaten(deeltoetsen);
                        draft.examendossierDeeltoetsen = examendossierDeeltoetsen;
                    })
                );
            })
        );
    }

    private createResultaatRequestInfo(plaatsingUuid?: string): RequestInformation {
        const queryParameters: { [key: string]: any } = {
            additional: [
                ADDITIONAL_VAKNAAM,
                ADDITIONAL_RESULTAATKOLOM,
                ADDITIONAL_NAAM_ALTERNATIEF_NIVEAU,
                ADDITIONAL_NAAM_STANDAARD_NIVEAU
            ],
            type: [
                'Toetskolom',
                'SamengesteldeToetsKolom',
                'Werkstukcijferkolom',
                'Advieskolom',
                'PeriodeGemiddeldeKolom',
                'RapportGemiddeldeKolom',
                'RapportCijferKolom',
                'RapportToetskolom',
                'SEGemiddeldeKolom',
                'ToetssoortGemiddeldeKolom'
            ],
            sort: 'desc-geldendResultaatCijferInvoer'
        };

        if (plaatsingUuid) {
            queryParameters['plaatsingUuid'] = plaatsingUuid;
        }

        return {
            responseType: 'json',
            queryParameters: queryParameters
        };
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<any>): void {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.RESULTATEN_TIMEOUT;
    }
}
