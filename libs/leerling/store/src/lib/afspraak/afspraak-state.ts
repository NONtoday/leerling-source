import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { addDays, differenceInCalendarDays, getWeek, getWeekYear, isMonday, previousMonday } from 'date-fns';
import { WritableDraft, produce } from 'immer';
import { RAfspraakActieResultaat, RAfspraakItem, RAfspraakItemWijziging } from 'leerling-codegen';
import { RequestInformationBuilder } from 'leerling-request';
import { catchError, of, tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState, insertOrUpdateItem } from '../util/abstract-state';
import { getJaarWeek, getJaarWeken, getMaandagVanWeek, toLocalDateTime } from '../util/date-util';
import { KwtActieUitvoerenReady, RefreshAfspraak, VoerKwtActieUit } from './afspraak-actions';
import { SAfspraakDag, SAfspraakModel, SAfspraakWeek, mapAfspraakItem } from './afspraak-model';

export const AFSPRAAK_STATE_TOKEN = new StateToken<SAfspraakModel>('afspraak');
const DEFAULT_STATE = { jaarWeken: undefined };

@State<SAfspraakModel>({
    name: AFSPRAAK_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class AfspraakState extends AbstractState {
    @Action(RefreshAfspraak)
    refreshAfspraak(ctx: StateContext<SAfspraakModel>, action: RefreshAfspraak) {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId) {
            return;
        }

        return this.cachedUnwrappedGet<RAfspraakItem>(`afspraakitems\\${leerlingId}\\jaar\\${action.jaar}\\week\\${action.week}`)?.pipe(
            tap((afspraakItems) => {
                const sAfspraakWeek = this.createSAfspraakWeek(action.jaar, action.week, afspraakItems);
                if (ctx.getState().jaarWeken) {
                    ctx.setState(patch({ jaarWeken: insertOrUpdateItem((item) => item.jaarWeek, sAfspraakWeek) }));
                } else {
                    ctx.setState({
                        jaarWeken: [sAfspraakWeek]
                    });
                }
            })
        );
    }

    @Action(VoerKwtActieUit)
    voerKwtActieUit(ctx: StateContext<SAfspraakModel>, action: VoerKwtActieUit) {
        const leerlingId = this.getLeerlingID();
        if (!leerlingId || this.isOffline()) {
            return of();
        }

        const inschrijven = action.kwtInfo.inschrijfStatus === 'NIET' || action.kwtInfo.inschrijfStatus === 'ONBEPAALD';

        const body = {
            actie: action.afspraakActie.uitvoerbareActie,
            inschrijven: inschrijven,
            kwtSysteem: action.kwtInfo.kwtSysteem,
            leerlingId: leerlingId,
            jaar: getWeekYear(action.afspraakActie.beginDatumTijd),
            week: getWeek(action.afspraakActie.beginDatumTijd)
        };
        // Verwerk de wijzigingen en geef de eventuele foutmelding door.
        return this.requestService
            .post<RAfspraakActieResultaat>('afspraakitems/uitvoeren', new RequestInformationBuilder().body(body).build())
            .pipe(
                tap((actieResultaat) => this.verwerkAfspraakWijzigingen(ctx, actieResultaat.afspraakItemWijzigingen ?? [])),
                tap((actieResultaat) => this._store.dispatch(new KwtActieUitvoerenReady(actieResultaat.foutmelding))),
                catchError(() => {
                    this._store.dispatch(new KwtActieUitvoerenReady('Er is iets fout gegaan.'));
                    return of();
                })
            );
    }

    private verwerkAfspraakWijzigingen(ctx: StateContext<SAfspraakModel>, afspraakWijzigingen: RAfspraakItemWijziging[]) {
        if (!ctx.getState().jaarWeken) return;

        ctx.setState(
            produce(ctx.getState(), (draft) => {
                afspraakWijzigingen.forEach((afspraakWijziging) => {
                    if (
                        !draft.jaarWeken ||
                        !afspraakWijziging.afspraakItem ||
                        !afspraakWijziging.afspraakItem.uniqueIdentifier ||
                        !afspraakWijziging.afspraakItem.beginDatumTijd ||
                        !afspraakWijziging.afspraakItem.eindDatumTijd
                    ) {
                        return;
                    }

                    const beginDatum = toLocalDateTime(afspraakWijziging.afspraakItem.beginDatumTijd);
                    const eindDatum = toLocalDateTime(afspraakWijziging.afspraakItem.eindDatumTijd);
                    const uniqueIdentifier = afspraakWijziging.afspraakItem.uniqueIdentifier;
                    const jaarWeken = getJaarWeken(beginDatum, eindDatum);

                    const jaarWekenState = draft.jaarWeken.filter((afspraakWeek) => {
                        return jaarWeken.filter((jaarWeek) => afspraakWeek.jaarWeek === jaarWeek);
                    });
                    if (!jaarWekenState.length) {
                        // Indien we nog geen data van deze weken ooit hebben opgehaald, hoeven we niets met dit afspraakitem.
                        return;
                    }

                    for (const jaarWeekIndex of jaarWekenState) {
                        const draftDagen = jaarWeekIndex.dagen;
                        // Verwijder alle bestaande afspraak-items met hetzelfde id.
                        // Bij een 'wijziging' voegen we de items daarna opnieuw toe.
                        for (const draftDag of draftDagen) {
                            if (!draftDag) {
                                continue;
                            }
                            draftDag.items = draftDag.items.filter((item) => item.uniqueIdentifier !== uniqueIdentifier);
                        }
                    }
                    // Indien het item niet verwijderd had moeten worden: voeg hem maar weer toe.
                    if (!afspraakWijziging.isVerwijderd) {
                        mapAfspraakItem(afspraakWijziging.afspraakItem).forEach((sAfspraakItem) => {
                            const jaarWeek = getJaarWeek(sAfspraakItem.beginDatumTijd);
                            const jaarWeekToUpdate: WritableDraft<SAfspraakWeek> | undefined = jaarWekenState.find(
                                (jaarWeekState) => jaarWeekState.jaarWeek === jaarWeek
                            );
                            if (!jaarWeekToUpdate) return;
                            const maandag = isMonday(sAfspraakItem.beginDatumTijd)
                                ? sAfspraakItem.beginDatumTijd
                                : previousMonday(sAfspraakItem.beginDatumTijd);
                            const dagIndex = differenceInCalendarDays(sAfspraakItem.beginDatumTijd, maandag);
                            jaarWeekToUpdate.dagen[dagIndex]?.items.push(sAfspraakItem);
                        });
                    }
                });
            })
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SAfspraakModel>) {
        return ctx.setState(DEFAULT_STATE);
    }

    private createSAfspraakWeek(jaar: number, week: number, rAfspraakItems: RAfspraakItem[]): SAfspraakWeek {
        const maandag = getMaandagVanWeek(week, jaar);
        const afspraakDagen = this.createEmptyAfspraakDagen(maandag);
        rAfspraakItems.forEach((rAfspraakItem) => {
            mapAfspraakItem(rAfspraakItem).forEach((afspraakItem) => {
                const dagIndex = differenceInCalendarDays(afspraakItem.beginDatumTijd, maandag);
                // Als deze niet gevonden wordt in de lijst, dan is het afspraak over weken heen waarbij de
                // context dus nog van vorige of volgende week kan zijn. Deze kunnen genegeerd worden.
                afspraakDagen[dagIndex]?.items.push(afspraakItem);
            });
        });

        const SAfspraakWeek: SAfspraakWeek = { jaarWeek: jaar + '~' + week, dagen: afspraakDagen };
        return SAfspraakWeek;
    }

    /**
     * Maakt een lijst van 7 afspraakDagen voor alle dagen in de week vanaf maandag
     * @param maandag
     * @returns
     */
    private createEmptyAfspraakDagen(maandag: Date): SAfspraakDag[] {
        let currentDate = maandag;

        const afspraakDagen: SAfspraakDag[] = [];
        for (let i = 0; i < 7; i++) {
            afspraakDagen.push({ datum: currentDate, items: [] });
            currentDate = addDays(currentDate, 1);
        }

        return afspraakDagen;
    }

    override getTimeout(): number {
        return CallService.AFSPRAKEN_TIMEOUT;
    }
}
