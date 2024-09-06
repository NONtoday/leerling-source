import { Injectable, inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Store } from '@ngxs/store';
import { addDays, getISOWeek, getYear, isFirstDayOfMonth, isToday, isWeekend, startOfWeek, subDays } from 'date-fns';
import { AuthenticationService } from 'leerling-authentication';
import {
    HuiswerkSelectors,
    RefreshHuiswerk,
    SStudiewijzerItem,
    ToggleAfgevinkt,
    getEindDatumSchooljaar,
    getJaarWeek,
    getStartDatumSchooljaar
} from 'leerling/store';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { StudiewijzerDag, StudiewijzerWeek } from './studiewijzer-model';

export const TOON_WEEKEND_KEY = 'studiewijzer-toon-weekend';

@Injectable({
    providedIn: 'root'
})
export class StudiewijzerService {
    private _store = inject(Store);
    private _authenticationService = inject(AuthenticationService);

    private _scrollableTitleSubject = new BehaviorSubject<string | undefined>('');

    public set scrollableTitle(title: string | undefined) {
        this._scrollableTitleSubject.next(title);
    }

    public get scrollableTitle$() {
        return this._scrollableTitleSubject.asObservable();
    }

    public getStudiewijzerItems(peilDatum: Date): Observable<SStudiewijzerItem[] | undefined> {
        return this._store.select(HuiswerkSelectors.getStudiewijzerDagItems(peilDatum));
    }

    public getWeekItems(peilDatum: Date): Observable<SStudiewijzerItem[] | undefined> {
        return this._store.select(HuiswerkSelectors.getStudiewijzerWeekItems(peilDatum));
    }

    public getStudiewijzerDagItemsVoorHeleWeek(peilDatum: Date): Observable<SStudiewijzerItem[] | undefined> {
        const beginWeek = startOfWeek(peilDatum, { weekStartsOn: 1 });
        const eindWeek = addDays(beginWeek, 6);
        return this._store.select(HuiswerkSelectors.getStudiewijzerDagItemsVoorHeleWeek(beginWeek, eindWeek));
    }

    public getStudiewijzerWeekEnDagItems(datum: Date): Observable<SStudiewijzerItem[]> {
        return combineLatest([this.getStudiewijzerDagItemsVoorHeleWeek(datum), this.getWeekItems(datum)]).pipe(
            map(([dagitems, weekitems]) => [...(dagitems ?? []), ...(weekitems ?? [])])
        );
    }

    public refreshStudiewijzer(beginDatum: Date): void {
        const jaarWeek = getJaarWeek(beginDatum);
        this._refreshStudiewijzer(jaarWeek);
    }

    private _refreshStudiewijzer(jaarWeek: string): void {
        this._store.dispatch(new RefreshHuiswerk(jaarWeek));
    }

    public updateToonWeekendPreference(toonWeekend: boolean): void {
        Preferences.set({ key: TOON_WEEKEND_KEY, value: toonWeekend.toString() });
    }

    public async getToonWeekendPreference(): Promise<boolean> {
        const { value } = await Preferences.get({ key: TOON_WEEKEND_KEY });
        return value === 'true';
    }

    public getDag(peildatum: Date): StudiewijzerDag {
        return {
            datum: peildatum,
            isEersteDag: isFirstDayOfMonth(peildatum),
            isVandaag: isToday(peildatum),
            isWeekendDag: isWeekend(peildatum)
        };
    }

    public vulDagen(peildatum: Date): StudiewijzerDag[] {
        return [-1, 0, 1].map((index) => {
            const currentDatum = addDays(peildatum, index);

            return {
                datum: currentDatum,
                isEersteDag: isFirstDayOfMonth(currentDatum),
                isVandaag: isToday(currentDatum),
                isWeekendDag: isWeekend(currentDatum)
            };
        });
    }

    public vulWeken(datum: Date): StudiewijzerWeek[] {
        const startDatumSchooljaar = getStartDatumSchooljaar(datum);
        const eindDatumSchooljaar = getEindDatumSchooljaar(datum);
        const weken: StudiewijzerWeek[] = [];
        let currentDate = startDatumSchooljaar;

        while (currentDate <= eindDatumSchooljaar) {
            const weeknummer = getISOWeek(currentDate);
            const jaar = getYear(currentDate);
            const dagen: StudiewijzerDag[] = [];

            for (let i = 0; i < 7; i++) {
                dagen.push({
                    datum: currentDate,
                    isEersteDag: isFirstDayOfMonth(currentDate),
                    isVandaag: isToday(currentDate),
                    isWeekendDag: isWeekend(currentDate)
                });
                currentDate = addDays(currentDate, 1);
            }
            weken.push({ jaar, weeknummer, dagen });
        }
        return weken;
    }

    public isAfvinkenToegestaan() {
        return !this._authenticationService.isCurrentContextOuderVerzorger;
    }

    public toggleAfgevinkt(item: SStudiewijzerItem) {
        return this._store.dispatch(new ToggleAfgevinkt(item));
    }

    public refreshStudiewijzerVoorPeildatum(date: Date): void {
        this.refreshStudiewijzer(subDays(date, 7));
        this.refreshStudiewijzer(date);
        this.refreshStudiewijzer(addDays(date, 7));
        this.refreshStudiewijzer(addDays(date, 14));
    }
}
