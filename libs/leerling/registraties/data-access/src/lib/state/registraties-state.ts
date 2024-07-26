import { Injectable } from '@angular/core';
import { Action, createSelector, Selector, State, StateContext, StateToken } from '@ngxs/store';
import { parseISO } from 'date-fns';
import { isPresent } from 'harmony';
import { RLeerlingoverzichtRegistratie, RLeerlingoverzichtRegistratiesWrapper, RRegistratie } from 'leerling-codegen';
import {
    LOCALSTORAGE_KEY_TIJDSPAN,
    registratieCategorieNamen,
    RMentordashboardOverzichtPeriode,
    SRegistratie,
    SRegistratieCategorie,
    SRegistratieCategorieNaam,
    SRegistratiePeriode,
    SRegistratiesState
} from 'leerling-registraties-models';
import { RequestInformationBuilder } from 'leerling-request';
import {
    AbstractState,
    assertIsDefined,
    AvailablePushType,
    Callproperties,
    CallService,
    IncomingPushAction,
    SMaatregelenState
} from 'leerling/store';
import { orderBy } from 'lodash-es';
import { map, tap } from 'rxjs';
import { match, P } from 'ts-pattern';
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
        const result = this.cachedGet<RLeerlingoverzichtRegistratiesWrapper>(
            `leerlingen/${this.getLeerlingID()}/registratieOverzicht`,
            new RequestInformationBuilder().parameter('periode', rperiode).build(),
            callProperties
        );
        if (result) {
            return result.pipe(
                map((rLeerlingoverzichtRegistratiesWrapper) =>
                    (rLeerlingoverzichtRegistratiesWrapper.registraties ?? [])
                        ?.map((rRegistratieCategorie): SRegistratieCategorie | undefined => {
                            const categorieNaam = getRRegistratieCategorieNaam(rRegistratieCategorie);
                            // filter categorieen die we niet willen tonen
                            if (!categorieNaam || !registratieCategorieNamen.includes(categorieNaam)) return;

                            return {
                                naam: categorieNaam,
                                aantal: rRegistratieCategorie.periodeRegistratieDetails?.aantalRegistraties ?? 0,
                                registraties: orderBy(
                                    rRegistratieCategorie.periodeRegistratieDetails?.vakRegistraties
                                        ?.flatMap((vakRegistratie) => vakRegistratie.registraties ?? [])
                                        .map(mapSRegistratie) ?? [],
                                    ['beginDatumTijd' satisfies keyof SRegistratie],
                                    'desc'
                                )
                            };
                        })
                        .filter(isPresent)
                ),
                tap((sRegistratieCategorieen) => ctx.patchState({ [tijdspan]: sRegistratieCategorieen, isLoading: false }))
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

type RLeerlingAfwezigheidsKolom = 'ONGEOORLOOFD_AFWEZIG' | 'GEOORLOOFD_AFWEZIG' | 'TE_LAAT' | 'VERWIJDERD';

const mapSRegistratie = (rRegistratie: RRegistratie) => {
    assertIsDefined(rRegistratie.beginDatumTijd);
    return {
        beginDatumTijd: parseISO(rRegistratie.beginDatumTijd),
        eindDatumTijd: rRegistratie.eindDatumTijd ? parseISO(rRegistratie.eindDatumTijd) : undefined,
        absentieReden: rRegistratie.absentieReden,
        opmerkingen: rRegistratie.opmerkingen,
        vakOfTitel: rRegistratie.vakOfTitel,
        beginLesuur: rRegistratie.beginLesuur,
        minutenGemist: rRegistratie.minutenGemist,
        eindLesuur: rRegistratie.eindLesuur
    };
};

const getRRegistratieCategorieNaam = (rRegistratieCategorie: RLeerlingoverzichtRegistratie) =>
    match(rRegistratieCategorie.categorie)
        .returnType<SRegistratieCategorieNaam | undefined>()
        .with({ kolom: P.nonNullable }, (cat) => rLeerlingAfwezigheidsKolomToSRegistratieCategorieNaam(cat.kolom))
        .with({ vrijVeld: { naam: P.union('Huiswerk niet in orde', 'Materiaal niet in orde') } }, (cat) => cat.vrijVeld?.naam)
        .otherwise(() => undefined);

const rLeerlingAfwezigheidsKolomToSRegistratieCategorieNaam = (kolom: RLeerlingAfwezigheidsKolom): SRegistratieCategorieNaam =>
    match(kolom)
        .returnType<SRegistratieCategorieNaam>()
        .with('ONGEOORLOOFD_AFWEZIG', () => 'Afwezig ongeoorloofd')
        .with('GEOORLOOFD_AFWEZIG', () => 'Afwezig geoorloofd')
        .with('TE_LAAT', () => 'Te laat')
        .with('VERWIJDERD', () => 'Verwijderd uit les')
        .exhaustive();
