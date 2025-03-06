import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { produce } from 'immer';
import { RGeldendResultaat, RGeldendVoortgangsdossierResultaat, RToetskolom } from 'leerling-codegen';
import { RequestInformation, RequestInformationBuilder } from 'leerling-request';
import { forkJoin, Observable, tap } from 'rxjs';
import { CallService, SCallDefinition } from '../../call/call.service';
import { SwitchContext } from '../../shared/shared-actions';
import { AbstractState } from '../../util/abstract-state';
import {
    ADDITIONAL_HEEFT_ALTERNATIEF_NIVEAU,
    ADDITIONAL_NAAM_ALTERNATIEF_NIVEAU,
    ADDITIONAL_NAAM_STANDAARD_NIVEAU,
    ADDITIONAL_PERIODE_AFKORTING,
    ADDITIONAL_RESULTAATKOLOM,
    ADDITIONAL_RESULTAATKOLOM_LEERJAAR,
    ADDITIONAL_VAKNAAM,
    createExamenToetskolommen,
    createGeldendExamendossierResultaten,
    createGeldendVoortgangsdossierResultaten,
    createVoortgangsToetskolommen
} from '../geldendresultaat-model';
import { GetExamendossierDeeltoetsen, GetVoortgangsdossierDeeltoetsen, RefreshVakResultaat } from './vakresultaat-actions';
import { createVakResultaatKey, SVakResultaatModel } from './vakresultaat-model';

export const VAK_RESULTAAT_STATE_TOKEN = new StateToken<SVakResultaatModel>('vakResultaat');
const DEFAULT_STATE = {
    geldendVoortgangsResultaten: undefined,
    geldendExamenResultaten: undefined,
    voortgangsdossierDeeltoetsen: undefined,
    examendossierDeeltoetsen: undefined,
    voortgangsdossierDeeltoetsKolommen: undefined,
    examendossierDeeltoetsKolommen: undefined,
    voortgangsKolommen: undefined,
    examenKolommen: undefined
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

        const callDefinitions: SCallDefinition[] = [];
        callDefinitions.push(
            this.createCallDefinition(
                `/geldendvoortgangsdossierresultaten/vakresultaten/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
                this.getTimeout(),
                this.createResultaatRequestInfo(action.plaatsingUuid, true)
            )
        );
        callDefinitions.push(
            this.createCallDefinition(
                `/geldendexamendossierresultaten/vakresultaten/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
                this.getTimeout(),
                this.createResultaatRequestInfo(action.plaatsingUuid)
            )
        );
        if (action.metKolommen) {
            callDefinitions.push(
                this.createCallDefinition(
                    `/geldendvoortgangsdossierresultaten/resultaatkolommen/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
                    this.getTimeout(),
                    this.createResultaatRequestInfo(action.plaatsingUuid, true)
                )
            );
            callDefinitions.push(
                this.createCallDefinition(
                    `/geldendexamendossierresultaten/resultaatkolommen/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
                    this.getTimeout(),
                    this.createResultaatRequestInfo(action.plaatsingUuid)
                )
            );
        }
        const areStillFresh = this.areFresh(callDefinitions);

        if (areStillFresh) {
            return;
        }

        const voortgangRequest$ = this.cachedUnwrappedGet<RGeldendVoortgangsdossierResultaat>(
            `/geldendvoortgangsdossierresultaten/vakresultaten/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
            this.createResultaatRequestInfo(action.plaatsingUuid, true),
            { force: true }
        );

        const examenRequest$ = this.cachedUnwrappedGet<RGeldendResultaat>(
            `/geldendexamendossierresultaten/vakresultaten/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
            this.createResultaatRequestInfo(action.plaatsingUuid),
            { force: true }
        );
        let voortgangKolommen$: Observable<RToetskolom[]> | undefined;
        let examenKolommen$: Observable<RToetskolom[]> | undefined;
        if (action.metKolommen) {
            voortgangKolommen$ = this.cachedUnwrappedGet<RToetskolom>(
                `/geldendvoortgangsdossierresultaten/resultaatkolommen/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
                this.createResultaatRequestInfo(action.plaatsingUuid, true),
                { force: true }
            );

            examenKolommen$ = this.cachedUnwrappedGet<RToetskolom>(
                `/geldendexamendossierresultaten/resultaatkolommen/${leerlingID}/vak/${action.vakUuid}/lichting/${action.lichtingUuid}`,
                this.createResultaatRequestInfo(action.plaatsingUuid),
                { force: true }
            );
        }

        const uitgevoerdeRequests = [];
        if (voortgangRequest$) {
            uitgevoerdeRequests.push(
                voortgangRequest$.pipe(
                    tap((voortgangsResultaten) => {
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
                            })
                        );
                    })
                )
            );
        }
        if (examenRequest$) {
            uitgevoerdeRequests.push(
                examenRequest$.pipe(
                    tap((examenResultaten) => {
                        ctx.setState(
                            produce(ctx.getState(), (draft) => {
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
                )
            );
        }

        if (voortgangKolommen$) {
            uitgevoerdeRequests.push(
                voortgangKolommen$.pipe(
                    tap((rVoortgangKolommen) => {
                        ctx.setState(
                            produce(ctx.getState(), (draft) => {
                                const voortgangsKolommen = draft.voortgangsKolommen ?? {};
                                voortgangsKolommen[key] = {
                                    vakUuid: action.vakUuid,
                                    lichtingUuid: action.lichtingUuid,
                                    plaatsingUuid: action.plaatsingUuid,
                                    resultaatKolommen: createVoortgangsToetskolommen(
                                        rVoortgangKolommen,
                                        action.vakUuid,
                                        action.lichtingUuid
                                    )
                                };
                                draft.voortgangsKolommen = voortgangsKolommen;
                            })
                        );
                    })
                )
            );
        }

        if (examenKolommen$) {
            uitgevoerdeRequests.push(
                examenKolommen$.pipe(
                    tap((rExamenKolommen) => {
                        ctx.setState(
                            produce(ctx.getState(), (draft) => {
                                const examenKolommen = draft.examenKolommen ?? {};
                                examenKolommen[key] = {
                                    vakUuid: action.vakUuid,
                                    lichtingUuid: action.lichtingUuid,
                                    plaatsingUuid: action.plaatsingUuid,
                                    resultaatKolommen: createExamenToetskolommen(rExamenKolommen, action.vakUuid, action.lichtingUuid)
                                };
                                draft.examenKolommen = examenKolommen;
                            })
                        );
                    })
                )
            );
        }

        return forkJoin(uitgevoerdeRequests);
    }

    @Action(GetVoortgangsdossierDeeltoetsen)
    getVoortgangsdossierDeeltoetsen(ctx: StateContext<SVakResultaatModel>, action: GetVoortgangsdossierDeeltoetsen) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        const deeltoetsResultaten$: Observable<RGeldendVoortgangsdossierResultaat[]> | undefined = this.cachedUnwrappedGet(
            `/geldendvoortgangsdossierresultaten/leerling/${leerlingID}/deeltoetsen/${action.samengesteldeToetsId}`,
            new RequestInformationBuilder().parameter('plaatsingUuid', action.plaatsingUuid).build()
        );

        const deeltoetsKolommen$: Observable<RToetskolom[]> | undefined = action.metKolommen
            ? this.cachedUnwrappedGet(
                  `/geldendvoortgangsdossierresultaten/leerling/${leerlingID}/deeltoetskolommen/${action.samengesteldeToetsId}`,
                  new RequestInformationBuilder().parameter('plaatsingUuid', action.plaatsingUuid).build()
              )
            : undefined;

        const resultatenEnOfKolommen = [];
        if (deeltoetsResultaten$) {
            resultatenEnOfKolommen.push(
                deeltoetsResultaten$.pipe(
                    tap((deeltoetsen) => {
                        ctx.setState(
                            produce(ctx.getState(), (draft) => {
                                const voortgangsdossierDeeltoetsen = draft.voortgangsdossierDeeltoetsen ?? {};
                                voortgangsdossierDeeltoetsen[action.samengesteldeToetsId] =
                                    createGeldendVoortgangsdossierResultaten(deeltoetsen);
                                draft.voortgangsdossierDeeltoetsen = voortgangsdossierDeeltoetsen;
                            })
                        );
                    })
                )
            );
        }

        if (deeltoetsKolommen$) {
            resultatenEnOfKolommen.push(
                deeltoetsKolommen$.pipe(
                    tap((deeltoetsKolommen) => {
                        ctx.setState(
                            produce(ctx.getState(), (draft) => {
                                const voortgangsdossierDeeltoetsKolommen = draft.voortgangsdossierDeeltoetsKolommen ?? {};
                                voortgangsdossierDeeltoetsKolommen[action.samengesteldeToetsId] = createVoortgangsToetskolommen(
                                    deeltoetsKolommen,
                                    undefined,
                                    undefined
                                );
                                draft.voortgangsdossierDeeltoetsKolommen = voortgangsdossierDeeltoetsKolommen;
                            })
                        );
                    })
                )
            );
        }

        return forkJoin(resultatenEnOfKolommen);
    }

    @Action(GetExamendossierDeeltoetsen)
    getExamendossierDeeltoetsen(ctx: StateContext<SVakResultaatModel>, action: GetVoortgangsdossierDeeltoetsen) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        const deeltoetsResultaten$ = this.cachedUnwrappedGet(
            `/geldendexamendossierresultaten/leerling/${leerlingID}/deeltoetsen/${action.samengesteldeToetsId}`,
            new RequestInformationBuilder().parameter('plaatsingUuid', action.plaatsingUuid).build()
        );

        const deeltoetsKolommen$ = action.metKolommen
            ? this.cachedUnwrappedGet(
                  `/geldendexamendossierresultaten/leerling/${leerlingID}/deeltoetskolommen/${action.samengesteldeToetsId}`,
                  new RequestInformationBuilder().parameter('plaatsingUuid', action.plaatsingUuid).build()
              )
            : undefined;

        const resultatenEnOfKolommen = [];

        if (deeltoetsResultaten$) {
            resultatenEnOfKolommen.push(
                deeltoetsResultaten$.pipe(
                    tap((deeltoetsen) => {
                        ctx.setState(
                            produce(ctx.getState(), (draft) => {
                                const examendossierDeeltoetsen = draft.examendossierDeeltoetsen ?? {};
                                examendossierDeeltoetsen[action.samengesteldeToetsId] = createGeldendExamendossierResultaten(deeltoetsen);
                                draft.examendossierDeeltoetsen = examendossierDeeltoetsen;
                            })
                        );
                    })
                )
            );
        }

        if (deeltoetsKolommen$) {
            resultatenEnOfKolommen.push(
                deeltoetsKolommen$.pipe(
                    tap((deeltoetsKolommen) => {
                        ctx.setState(
                            produce(ctx.getState(), (draft) => {
                                const examendossierDeeltoetsen = draft.examendossierDeeltoetsKolommen ?? {};
                                examendossierDeeltoetsen[action.samengesteldeToetsId] = createExamenToetskolommen(
                                    deeltoetsKolommen,
                                    undefined,
                                    undefined
                                );
                                draft.examendossierDeeltoetsKolommen = examendossierDeeltoetsen;
                            })
                        );
                    })
                )
            );
        }
        return forkJoin(resultatenEnOfKolommen);
    }

    private createResultaatRequestInfo(plaatsingUuid?: string, metPeriodeAfkortingAdditional = false): RequestInformation {
        const queryParameters: { [key: string]: any } = {
            additional: [
                ADDITIONAL_VAKNAAM,
                ADDITIONAL_RESULTAATKOLOM,
                ADDITIONAL_HEEFT_ALTERNATIEF_NIVEAU,
                ADDITIONAL_NAAM_ALTERNATIEF_NIVEAU,
                ADDITIONAL_NAAM_STANDAARD_NIVEAU,
                ADDITIONAL_RESULTAATKOLOM_LEERJAAR
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

        if (metPeriodeAfkortingAdditional) {
            queryParameters['additional'].push(ADDITIONAL_PERIODE_AFKORTING);
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
