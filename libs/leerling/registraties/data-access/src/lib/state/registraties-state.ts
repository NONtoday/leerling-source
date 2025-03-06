import { Injectable } from '@angular/core';
import { Action, createSelector, Selector, State, StateContext, StateToken } from '@ngxs/store';
import { differenceInMinutes } from 'date-fns';
import { isPresent } from 'harmony';
import { RAfspraakItem, RLeerlingRegistratie, RLeerlingRegistraties } from 'leerling-codegen';
import {
    LOCALSTORAGE_KEY_TIJDSPAN,
    RMentordashboardOverzichtPeriode,
    SRegistratie,
    SRegistratiePeriode,
    SRegistraties,
    SRegistratiesState
} from 'leerling-registraties-models';
import { RequestInformationBuilder } from 'leerling-request';
import {
    AbstractState,
    AvailablePushType,
    Callproperties,
    CallService,
    IncomingPushAction,
    mapAfspraakItem,
    SMaatregelenState,
    toLocalDateTime
} from 'leerling/store';
import { map, tap } from 'rxjs';
import { match } from 'ts-pattern';
import { RefreshRegistraties, SelectTijdspan, SetIsLoading } from './registraties.actions';

export const BERICHT_STATE_TOKEN = new StateToken<SRegistratiesState>('registraties');

const DEFAULT_STATE: SRegistratiesState = {
    selectedTijdspan: 'Dit schooljaar',
    'Laatste 7 dagen': undefined,
    'Laatste 30 dagen': undefined,
    'Deze periode': undefined,
    'Dit schooljaar': undefined,
    isLoading: false
};

@State<SRegistratiesState>({
    name: BERICHT_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class RegistratiesState extends AbstractState {
    @Action(SelectTijdspan)
    selectTijdspanAndRefreshRegistraties(ctx: StateContext<SRegistratiesState>, action: SelectTijdspan) {
        localStorage.setItem(LOCALSTORAGE_KEY_TIJDSPAN, action.tijdspan);
        return ctx.patchState({ selectedTijdspan: action.tijdspan });
    }

    @Action(RefreshRegistraties)
    refreshRegistraties(ctx: StateContext<SRegistratiesState>, action: RefreshRegistraties) {
        const tijdspan = ctx.getState().selectedTijdspan;
        const rperiode = match(tijdspan)
            .returnType<RMentordashboardOverzichtPeriode>()
            .with('Laatste 7 dagen', () => 'ZEVEN_DAGEN')
            .with('Laatste 30 dagen', () => 'DERTIG_DAGEN')
            .with('Deze periode', () => 'CIJFERPERIODE')
            .with('Dit schooljaar', () => 'SCHOOLJAAR')
            .exhaustive();

        ctx.patchState({ isLoading: true });

        const callProperties: Callproperties = {};
        if (action.requestOptions.forceRequest) {
            callProperties.force = true;
        }
        const result = this.cachedGet<RLeerlingRegistraties>(
            `leerlingen/${this.getLeerlingID()}/registratieOverzicht`,
            new RequestInformationBuilder().parameter('periode', rperiode).build(),
            callProperties
        );

        if (result) {
            return result.pipe(
                map(mapRegistraties),
                tap((registraties) => ctx.patchState({ [tijdspan]: registraties, isLoading: false }))
            );
        } else {
            // Fallback for when the result is 'cached'.
            ctx.patchState({ isLoading: false });
            return result;
        }
    }

    @Action(IncomingPushAction)
    incomingPushAction(ctx: StateContext<SMaatregelenState>, action: IncomingPushAction) {
        if (action.type === AvailablePushType.AFWEZIGHEID) {
            ctx.dispatch(new RefreshRegistraties({ forceRequest: true }));
        }
    }

    @Action(SetIsLoading)
    setIsLoading(ctx: StateContext<SRegistratiesState>, action: SetIsLoading) {
        return ctx.patchState({ isLoading: action.isLoading });
    }

    @Selector()
    static tijdspan(state: SRegistratiesState) {
        return state.selectedTijdspan;
    }

    @Selector()
    static isLoading(state: SRegistratiesState) {
        return state.isLoading;
    }

    static registratieCategorieen(tijdspan: SRegistratiePeriode) {
        return createSelector([RegistratiesState], (state: SRegistratiesState) => {
            return state[tijdspan satisfies keyof SRegistratiesState];
        });
    }

    override switchContext(ctx: StateContext<any>): void {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.REGISTRATIES_TIMEOUT;
    }
}

const mapRegistraties = (registraties: RLeerlingRegistraties): SRegistraties => ({
    afwezigWaarnemingen: registraties?.afwezigWaarnemingen?.map(mapRegistratie)?.filter(isPresent) ?? [],
    geoorloofdAfwezig: registraties?.geoorloofdAfwezig?.map(mapRegistratie)?.filter(isPresent) ?? [],
    ongeoorloofdAfwezig: registraties?.ongeoorloofdAfwezig?.map(mapRegistratie)?.filter(isPresent) ?? [],
    teLaat: registraties?.teLaat?.map(mapRegistratie)?.filter(isPresent) ?? [],
    verwijderd: registraties?.verwijderd?.map(mapRegistratie)?.filter(isPresent) ?? [],
    huiswerkNietInOrde:
        registraties?.huiswerkNietGemaakt
            ?.map((afspraak) => mapAfspraakRegistratie(afspraak, 'Huiswerk niet in orde'))
            ?.filter(isPresent) ?? [],
    materiaalNietInOrde:
        registraties?.materiaalNietInOrde
            ?.map((afspraak) => mapAfspraakRegistratie(afspraak, 'Materiaal niet in orde'))
            ?.filter(isPresent) ?? []
});

const mapRegistratie = (registratie: RLeerlingRegistratie): SRegistratie | undefined => {
    if (!registratie.begin) return undefined;

    const begin = toLocalDateTime(registratie.begin);
    const eindOfNu = registratie.eind ? toLocalDateTime(registratie.eind) : new Date();

    return {
        begin: begin,
        eind: registratie.eind ? toLocalDateTime(registratie.eind) : undefined,
        minutenGemist: differenceInMinutes(eindOfNu, begin),
        omschrijving: registratie.omschrijving ?? '-',
        afgehandeld: registratie.afgehandeld ?? false,
        afspraken: registratie?.afspraken?.map(mapAfspraakItem).flat() ?? []
    };
};

const mapAfspraakRegistratie = (afspraak: RAfspraakItem, defaultOmschrijving: string): SRegistratie | undefined => {
    if (!afspraak.beginDatumTijd) return undefined;

    return {
        begin: toLocalDateTime(afspraak.beginDatumTijd),
        eind: undefined,
        minutenGemist: 0,
        omschrijving: afspraak.vak?.naam ?? afspraak.titel ?? afspraak.omschrijving ?? defaultOmschrijving,
        afgehandeld: true,
        afspraken: mapAfspraakItem(afspraak)
    };
};
