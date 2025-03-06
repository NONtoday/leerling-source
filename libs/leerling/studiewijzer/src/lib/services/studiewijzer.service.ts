import { Injectable, inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Store } from '@ngxs/store';
import { addDays, getISOWeek, getISOWeekYear, isFirstDayOfMonth, isToday, isWeekend, startOfWeek, subDays } from 'date-fns';
import { AuthenticationService } from 'leerling-authentication';
import { RouterService } from 'leerling-base';
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

export function vulWeken(datum: Date): StudiewijzerWeek[] {
    const startDatumSchooljaar = getStartDatumSchooljaar(datum);
    const eindDatumSchooljaar = getEindDatumSchooljaar(datum);
    const weken: StudiewijzerWeek[] = [];
    let currentDate = startDatumSchooljaar;

    while (currentDate <= eindDatumSchooljaar) {
        const weeknummer = getISOWeek(currentDate);
        const jaar = getISOWeekYear(currentDate);
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
@Injectable({
    providedIn: 'root'
})
export class StudiewijzerService {
    private _store = inject(Store);
    private _authenticationService = inject(AuthenticationService);
    private _routerService = inject(RouterService);

    private _scrollableTitleSubject = new BehaviorSubject<string | undefined>('');

    public set scrollableTitle(title: string | undefined) {
        this._scrollableTitleSubject.next(title);
    }

    openSidebarMetStudiewijzerItem(studiewijzerItem?: SStudiewijzerItem) {
        if (!studiewijzerItem) return;

        this._routerService.routeToStudiewijzer(studiewijzerItem.id, studiewijzerItem.datumTijd);
    }

    public isStudiewijzerLoaded(peilDatum: Date): Observable<boolean> {
        const jaarweek = getJaarWeek(peilDatum);
        return this._store.select(HuiswerkSelectors.heeftHuiswerkWeek(jaarweek));
    }

    /**
     * Geeft het totaal aantal items dit schooljaar wat voor de peilweek valt.
     */
    public getAantalItemsTotPeilweek(peilDatum: Date): Observable<number> {
        return this._store.select(HuiswerkSelectors.getAantalItemsTotPeilweek(peilDatum));
    }

    public getAantalItemsTotPeilweekSnapshot(peilDatum: Date): number {
        return this._store.selectSnapshot(HuiswerkSelectors.getAantalItemsTotPeilweek(peilDatum));
    }

    public get scrollableTitle$() {
        return this._scrollableTitleSubject.asObservable();
    }

    public getStudiewijzerItems(peilDatum: Date): Observable<SStudiewijzerItem[] | undefined> {
        return this._store.select(HuiswerkSelectors.getStudiewijzerDagItems(peilDatum));
    }

    public getStudiewijzerItem(jaarWeek: string, id: number): Observable<SStudiewijzerItem | undefined> {
        return this._store.select(HuiswerkSelectors.getStudiewijzerItem(jaarWeek, id));
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

    public refreshStudiewijzer(datum: Date): void {
        const jaarWeek = getJaarWeek(datum);
        const heeftStudiewijzerWeek = this._hasStudiewijzer(jaarWeek);
        const needsRefresh = this._needsRefresh(jaarWeek);
        if (!heeftStudiewijzerWeek || needsRefresh) {
            this._store.dispatch(new RefreshHuiswerk(jaarWeek));
        }
    }

    private _hasStudiewijzer(jaarWeek: string): boolean {
        return this._store.selectSnapshot(HuiswerkSelectors.heeftHuiswerkWeek(jaarWeek));
    }

    private _needsRefresh(jaarWeek: string): boolean {
        const uuid = this._authenticationService.currentSessionIdentifier?.UUID || 'no-session';
        const lastRefreshed = localStorage.getItem('huiswerk-refresh-' + uuid + '-' + jaarWeek);
        const needsRefresh = !lastRefreshed || Number(lastRefreshed) + 30000 < new Date().getTime();
        if (needsRefresh) {
            localStorage.setItem('huiswerk-refresh-' + uuid + '-' + jaarWeek, new Date().getTime().toString());
        }
        return needsRefresh;
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

    public isAfvinkenToegestaan() {
        return !this._authenticationService.isCurrentContextOuderVerzorger;
    }

    public toggleAfgevinkt(item: SStudiewijzerItem) {
        this._store.dispatch(new ToggleAfgevinkt(item));
    }

    public refreshStudiewijzerEnOmliggendeWeken(date: Date): void {
        this.refreshStudiewijzer(subDays(date, 7));
        this.refreshStudiewijzer(date);
        this.refreshStudiewijzer(addDays(date, 7));
    }
}
