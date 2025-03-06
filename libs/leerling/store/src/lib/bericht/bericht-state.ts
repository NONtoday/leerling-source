import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Action, NgxsAfterBootstrap, Selector, State, StateContext, StateToken } from '@ngxs/store';
import { patch, removeItem, updateItem } from '@ngxs/store/operators';
import { isPresent, shareReplayLastValue } from 'harmony';
import { RBoodschap, RBoodschapConversatie, RBoodschapCorrespondent, RMedewerker } from 'leerling-codegen';
import { RequestInformationBuilder } from 'leerling-request';
import { isEqual, orderBy, uniqBy } from 'lodash-es';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { mapMedewerker } from '../medewerker/medewerker-model';
import { IncomingPushAction } from '../pushaction/pushaction-actions';
import { AvailablePushType } from '../pushaction/pushaction-model';
import { RechtenService } from '../rechten/rechten.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState, Callproperties } from '../util/abstract-state';
import {
    GetExtraOntvangersBoodschap,
    MarkeerGelezen,
    MarkeerInleverboodschapGelezen,
    MarkeerOngelezen,
    RefreshConversaties,
    RefreshToegestaneOntvangers,
    VerstuurNieuwBericht,
    VerstuurReactieBericht,
    VerwijderConversatie
} from './bericht-actions';
import {
    ADDITIONAL_AANTAL_EXTRA_ONTVANGERS,
    ADDITIONAL_ACTIEF_VOOR_GEBRUIKER,
    ADDITIONAL_ONTVANGER_CORRESPONDENTEN,
    ADDITIONAL_VAKKEN_DOCENT_VOOR_LEERLING,
    ADDITIONAL_VERZENDER_CORRESPONDENT,
    ADDITIONAL_VERZONDEN_DOOR_GEBRUIKER,
    SBerichtenState,
    SBoodschap,
    SConversatie,
    mapBoodschap,
    mapBoodschapCorrespondent,
    mapConversatie,
    mapRNieuwBericht,
    mapRReactieBericht
} from './bericht-model';

export const BERICHT_STATE_TOKEN = new StateToken<SBerichtenState>('bericht');

const DEFAULT_STATE: SBerichtenState = { conversaties: undefined, toegestaneOntvangers: undefined, alleConversatiesOpgehaald: false };

const POLLING_INTERVAL = 15 * 60 * 1000; // 15 minuten

export const REFRESH_CONVERSATIES_PATH = '/boodschappen/conversaties';

@State<SBerichtenState>({
    name: BERICHT_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class BerichtState extends AbstractState implements NgxsAfterBootstrap {
    private destroyRef = inject(DestroyRef);
    private restartPollingSubject = new BehaviorSubject<number>(0);
    private rechtenService = inject(RechtenService);

    ngxsAfterBootstrap(ctx: StateContext<BerichtState>): void {
        this.startPolling(ctx);
    }

    @Action(RefreshConversaties)
    refreshConversaties(ctx: StateContext<SBerichtenState>, action: RefreshConversaties) {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }

        this.restartPolling();

        const alleConversatiesOphalen = action.refreshOptions?.alleConversaties ?? false;
        const callProperties: Callproperties = {};
        if (action.refreshOptions.forceRequest) {
            callProperties.force = true;
        }
        return this.cachedUnwrappedGet<RBoodschapConversatie>(
            REFRESH_CONVERSATIES_PATH,
            new RequestInformationBuilder()
                .additionals(
                    ADDITIONAL_VERZONDEN_DOOR_GEBRUIKER,
                    ADDITIONAL_VERZENDER_CORRESPONDENT,
                    ADDITIONAL_ONTVANGER_CORRESPONDENTEN,
                    ADDITIONAL_AANTAL_EXTRA_ONTVANGERS,
                    ADDITIONAL_ACTIEF_VOOR_GEBRUIKER
                )
                .parameter('alle', action.refreshOptions.alleConversaties)
                .build()
        )?.pipe(
            tap(() => {
                if (alleConversatiesOphalen) {
                    // Op undefined zetten in de state, zodat de loader wordt getoond.
                    ctx.setState(patch({ alleConversatiesOpgehaald: undefined }));
                }
            }),
            tap((rconversaties) => {
                const newConversaties = rconversaties.map((x) => mapConversatie(leerlingId, x));
                const conversatiesBaseState = ctx.getState().conversaties ?? [];
                const updatedConversaties = uniqBy([...newConversaties, ...conversatiesBaseState], (conversatie) => conversatie.id);

                // Doordat ongelezen conversaties altijd worden opgehaald, kunnen er bij het ophalen van alle conversaties ook conversaties tussen zitten die nieuwer zijn dan deze ongelezen conversaties.
                // Die zijn hierboven aan het einde toegevoegd, dus daarom de samengevoegde state nogmaals sorteren.
                const sortedConversaties = orderBy(updatedConversaties, (conversatie) => conversatie.boodschappen[0].verzendDatum, [
                    'desc'
                ]);

                const alleConversatiesOpgehaald = ctx.getState().alleConversatiesOpgehaald || alleConversatiesOphalen;
                ctx.patchState({
                    conversaties: sortedConversaties,
                    alleConversatiesOpgehaald: alleConversatiesOpgehaald
                });
            })
        );
    }

    @Action(MarkeerGelezen)
    markeerGelezen(ctx: StateContext<SBerichtenState>, action: MarkeerGelezen) {
        return this.markeerAlsGelezen(ctx, action.conversatie.boodschappen[0], action.conversatie);
    }

    private markeerAlsGelezen(ctx: StateContext<SBerichtenState>, boodschap: SBoodschap, conversatie?: SConversatie) {
        const beforeState = ctx.getState();
        if (conversatie) {
            ctx.setState(
                patch({
                    conversaties: updateItem((bestaandeConversatie) => bestaandeConversatie.id === conversatie.id, {
                        ...conversatie,
                        datumOudsteOngelezenBoodschap: undefined
                    })
                })
            );
        }

        return this.requestService
            .post<void>(`/boodschappen/conversatie/${boodschap.id}/markeerGelezen`, new RequestInformationBuilder().build())
            .subscribe({ error: () => ctx.setState(beforeState) });
    }

    @Action(MarkeerInleverboodschapGelezen)
    markeerInleverboodschapGelezen(ctx: StateContext<SBerichtenState>, action: MarkeerInleverboodschapGelezen) {
        const conversatie = ctx
            .getState()
            .conversaties?.find((conversatie) => conversatie.boodschappen.map((boodschap) => boodschap.id).includes(action.boodschap.id));

        return this.markeerAlsGelezen(ctx, action.boodschap, conversatie);
    }

    @Action(MarkeerOngelezen)
    markeerOngelezen(ctx: StateContext<SBerichtenState>, action: MarkeerOngelezen) {
        const boodschapId = action.conversatie.boodschappen[0].id;
        const beforeState = ctx.getState();
        ctx.setState(
            patch({
                conversaties: updateItem((conversatie) => conversatie.id === action.conversatie.id, {
                    ...action.conversatie,
                    datumOudsteOngelezenBoodschap: action.conversatie.boodschappen[0].verzendDatum
                })
            })
        );
        return this.requestService
            .put<void>(`/boodschappen/setGelezen/${boodschapId}`, new RequestInformationBuilder().parameter('gelezen', false).build())
            .subscribe({ error: () => ctx.setState(beforeState) });
    }

    @Action(VerwijderConversatie)
    verwijderConversatie(ctx: StateContext<SBerichtenState>, action: VerwijderConversatie) {
        const boodschapId = action.conversatie.boodschappen[0].id;
        const beforeState = ctx.getState();
        ctx.setState(patch({ conversaties: removeItem((conversatie) => conversatie.id === action.conversatie.id) }));
        return this.requestService
            .post<void>(`/boodschappen/conversatie/${boodschapId}/verwijder`, new RequestInformationBuilder().build())
            .subscribe({ error: () => ctx.setState(beforeState) });
    }

    @Action(RefreshToegestaneOntvangers)
    refreshOntvangers(ctx: StateContext<SBerichtenState>) {
        return this.cachedUnwrappedGet<RMedewerker>(
            '/medewerkers/ontvangers',
            new RequestInformationBuilder().additionals(ADDITIONAL_VAKKEN_DOCENT_VOOR_LEERLING).build()
        )?.pipe(
            tap((rmedewerkers) => {
                ctx.setState(
                    patch({
                        toegestaneOntvangers: rmedewerkers.map(mapMedewerker)
                    })
                );
            })
        );
    }

    @Action(VerstuurNieuwBericht)
    verstuurNieuwBericht(ctx: StateContext<SBerichtenState>, action: VerstuurNieuwBericht) {
        const rNieuwBericht = mapRNieuwBericht(action.nieuwBerichtInput);

        return this.requestService
            .post<RBoodschap>(
                '/verstuurdbericht/nieuw',
                new RequestInformationBuilder().body(rNieuwBericht).parameter('alsConversatieBoodschap', true).build()
            )
            .pipe(
                map(mapBoodschap),
                tap((createdStoreBoodschap) => {
                    const nieuweConversatie: SConversatie = {
                        id: createdStoreBoodschap.id,
                        boodschappen: [createdStoreBoodschap],
                        datumOudsteOngelezenBoodschap: undefined,
                        studiewijzerItemVanInleverperiode: undefined
                    };
                    const updatedConversaties = [nieuweConversatie, ...(ctx.getState().conversaties ?? [])];
                    ctx.setState(patch({ conversaties: updatedConversaties }));
                })
            );
    }

    @Action(VerstuurReactieBericht)
    verstuurReactieBericht(ctx: StateContext<SBerichtenState>, action: VerstuurReactieBericht) {
        const rReactieBericht = mapRReactieBericht(action.reactieBerichtInput);

        return this.requestService
            .post<RBoodschap>(
                '/verstuurdbericht/reactie',
                new RequestInformationBuilder().body(rReactieBericht).parameter('alsConversatieBoodschap', true).build()
            )
            .pipe(
                map(mapBoodschap),
                tap((createdStoreBoodschap) => {
                    ctx.setState(
                        patch({
                            conversaties: updateItem((conversatie) => conversatie.id === action.conversatie.id, {
                                ...action.conversatie,
                                boodschappen: [createdStoreBoodschap, ...action.conversatie.boodschappen]
                            })
                        })
                    );
                })
            );
    }

    @Action(GetExtraOntvangersBoodschap)
    getExtraOntvangersBoodschap(ctx: StateContext<SBerichtenState>, action: GetExtraOntvangersBoodschap) {
        const bestaandeExtraCorrespondenten = action.conversatie.boodschappen.find(
            (boodschap) => boodschap.id === action.boodschapId
        )?.extraOntvangerCorrespondenten;
        if (bestaandeExtraCorrespondenten?.length ?? 0 > 0) {
            // Extra ontvangers bestaan al, dus niks doen.
            return;
        }
        return this.cachedUnwrappedGet<RBoodschapCorrespondent>(
            `/boodschappen/conversatie/${action.boodschapId}/extraOntvangers`,
            new RequestInformationBuilder().build()
        )?.pipe(
            tap((rOntvangers) => {
                ctx.setState(
                    patch({
                        conversaties: updateItem((conversatie) => conversatie.id === action.conversatie.id, {
                            ...action.conversatie,
                            boodschappen: action.conversatie.boodschappen.map((boodschap) => {
                                if (boodschap.id === action.boodschapId) {
                                    return {
                                        ...boodschap,
                                        extraOntvangerCorrespondenten: rOntvangers.map(mapBoodschapCorrespondent).filter(isPresent)
                                    };
                                }
                                return boodschap;
                            })
                        })
                    })
                );
            })
        );
    }

    @Selector()
    static aantalOngelezenConversatiesPostvakIn(state: SBerichtenState): number {
        return this.postvakIn(state)?.filter((conversatie) => conversatie.datumOudsteOngelezenBoodschap !== undefined).length || 0;
    }

    @Selector()
    static postvakIn(state: SBerichtenState) {
        if (state.conversaties === undefined) return undefined;
        return state.conversaties.filter((conversatie) =>
            conversatie.boodschappen.some((boodschap) => !boodschap.verzondenDoorGebruiker && boodschap.verwijderd !== true)
        );
    }

    @Selector()
    static postvakUit(state: SBerichtenState) {
        if (state.conversaties === undefined) return undefined;
        return state.conversaties.filter((conversatie) =>
            conversatie.boodschappen.some(
                (boodschap) => boodschap.verzondenDoorGebruiker && !boodschap.isSomtodayAutomatischBericht && boodschap.verwijderd !== true
            )
        );
    }

    @Selector()
    static toegestaneOntvangers(state: SBerichtenState) {
        return state.toegestaneOntvangers;
    }

    @Selector()
    static alleConversatiesOpgehaald(state: SBerichtenState) {
        return state.alleConversatiesOpgehaald;
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SBerichtenState>) {
        ctx.setState(DEFAULT_STATE);
    }

    /**
     * Let op: afhankelijk van PushActionState.
     */
    @Action(IncomingPushAction)
    incomingPushAction(ctx: StateContext<any>, action: IncomingPushAction): void {
        // Berichten push notification: haal conversaties opnieuw op.
        if (action.type === AvailablePushType.BERICHTEN || action.type === AvailablePushType.INLEVERPERIODEBERICHT) {
            ctx.dispatch(new RefreshConversaties({ forceRequest: true }));
        }
    }

    override getTimeout(): number {
        return CallService.BERICHTEN_TIMEOUT;
    }

    private startPolling(ctx: StateContext<BerichtState>) {
        const heeftBerichtenRechten = this.rechtenService.getCurrentAccountRechten().pipe(
            distinctUntilChanged(isEqual),
            map((rechten) => !!rechten.berichtenBekijkenAan),
            shareReplayLastValue(),
            filter((heeftRechten) => heeftRechten)
        );

        heeftBerichtenRechten
            .pipe(
                // Refresh de conversaties direct als de account de rechten heeft.
                tap(() => ctx.dispatch(new RefreshConversaties())),
                switchMap(() => this.restartPollingSubject),
                debounceTime(POLLING_INTERVAL),
                // Het kan zijn dat de huidige account aan het eind van de polling interval niet de berichten rechten heeft, dus opnieuw checken.
                switchMap(() => heeftBerichtenRechten),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => ctx.dispatch(new RefreshConversaties()));
    }

    private restartPolling() {
        this.restartPollingSubject.next(this.restartPollingSubject.value + 1);
    }
}
