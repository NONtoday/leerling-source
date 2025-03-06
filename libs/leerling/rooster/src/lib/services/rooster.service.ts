import { inject, Injectable, untracked } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Store } from '@ngxs/store';
import { endOfDay, startOfDay } from 'date-fns';
import { isPresent } from 'harmony';
import { AuthenticationService } from 'leerling-authentication';
import { RequestService } from 'leerling-request';
import {
    AfspraakSelectors,
    getJaarWeek,
    RefreshAfspraak,
    RefreshHuiswerk,
    RefreshMaatregelen,
    SAfspraakActie,
    SAfspraakItem,
    SharedSelectors,
    SKWTInfo,
    SMaatregelToekenning,
    SStatusNotification,
    SStudiewijzerItem,
    VoerKwtActieUit
} from 'leerling/store';
import { BehaviorSubject, from, map, Observable, of } from 'rxjs';
import { RoosterViewModel } from './rooster-model';
import { RoosterSelectors } from './rooster-selectors';

export const TOON_WEEKEND_KEY = 'rooster-toon-weekend';

export interface HuiswerkWeekEnDagItems {
    weekitems: SStudiewijzerItem[];
    dagitems: SStudiewijzerItem[];
}

@Injectable({
    providedIn: 'root'
})
export class RoosterService {
    private _store = inject(Store);
    private _requestService = inject(RequestService);
    private _authenticationService = inject(AuthenticationService);

    private _scrollableTitleSubject = new BehaviorSubject<string | undefined>('');

    public getRooster(beginDatum: Date, eindDatum: Date, refreshMaatregelen: boolean): Observable<RoosterViewModel | undefined> {
        const startOfDatum = startOfDay(beginDatum);
        this.refreshRooster(startOfDatum);
        if (refreshMaatregelen) {
            this.refreshMaatregelen();
        }
        return this._store.select(RoosterSelectors.getDagEnWeekItems(beginDatum, eindDatum));
    }

    public getRoosterVoorDag(datum: Date, refreshMaatregelen: boolean): Observable<RoosterViewModel | undefined> {
        const startOfDatum = startOfDay(datum);
        this.refreshRooster(startOfDatum);
        if (refreshMaatregelen) {
            this.refreshMaatregelen();
        }
        return this._store.select(RoosterSelectors.getViewModel(startOfDatum, endOfDay(datum)));
    }

    public voerKwtActieUit(kwtInfo: SKWTInfo, afspraakActie: SAfspraakActie, jaarWeek: string): Observable<void> {
        return this._store.dispatch(new VoerKwtActieUit(kwtInfo, afspraakActie, jaarWeek));
    }

    public getAfspraakHerhalingInfo(uitvoerbareActieId: string | undefined): Observable<Date[]> {
        // uitvoerbareActieId is het id van de afspraak die je wilt selecteren
        const leerlingId = this._store.selectSnapshot(SharedSelectors.getAccountContext()).leerlingId;

        if (!leerlingId || !uitvoerbareActieId) {
            return of([]);
        }

        return this._requestService.unwrappedGet<Date>(`afspraakitems/herhalingsinfo/${leerlingId}/${uitvoerbareActieId}`);
    }

    public getHuiswerkWeekEnDagItems(datum: Date): Observable<HuiswerkWeekEnDagItems> {
        return this.getRoosterVoorDag(datum, false).pipe(
            map((data) => ({
                weekitems: data?.weekitems ?? [],
                dagitems: data?.dagen[0].dagitems ?? [],
                dagMaatregelen: data?.dagen[0].maatregelen ?? []
            }))
        );
    }

    public getWeekNotificationsVoor(datum: Date): Observable<SStatusNotification[] | undefined> {
        return this._store.select(AfspraakSelectors.getWeekNotifications(datum));
    }

    public getDagMaatregelen(datum: Date): Observable<SMaatregelToekenning[]> {
        return this.getRoosterVoorDag(datum, true).pipe(map((data) => data?.dagen[0].maatregelen ?? []));
    }

    public static formatBeginEindLesuurForAriaLabel(afspraakItem: SAfspraakItem): string | undefined {
        if (!isPresent(afspraakItem.beginLesuur)) return undefined;

        if (!isPresent(afspraakItem.eindLesuur) || afspraakItem.beginLesuur === afspraakItem.eindLesuur) {
            return afspraakItem.beginLesuur + 'e uur';
        }

        if (afspraakItem.eindLesuur - afspraakItem.beginLesuur === 1) {
            return afspraakItem.beginLesuur + 'e en ' + afspraakItem.eindLesuur + 'e uur';
        } else {
            return afspraakItem.beginLesuur + 'e tot en met ' + afspraakItem.eindLesuur + 'e uur';
        }
    }

    public refreshMaatregelen(): void {
        this._store.dispatch(new RefreshMaatregelen());
    }

    public refreshRooster(beginDatum: Date): void {
        const jaarWeek = getJaarWeek(beginDatum);
        this._refreshRooster(jaarWeek);
    }

    private _refreshRooster(jaarWeek: string): void {
        const hasWeek = this._hasRoosterFor(jaarWeek);
        const needsRefresh = this._needsRefresh(jaarWeek);
        if (!hasWeek || needsRefresh) {
            untracked(() => this._store.dispatch(new RefreshHuiswerk(jaarWeek)));
            const jaar = parseInt(jaarWeek.substring(0, 4));
            const week = parseInt(jaarWeek.substring(5));
            this._store.dispatch(new RefreshAfspraak(jaar, week));
        }
    }

    private _hasRoosterFor(jaarWeek: string): boolean {
        return this._store.selectSnapshot(AfspraakSelectors.heeftAfspraakWeek(jaarWeek));
    }

    private _needsRefresh(jaarWeek: string): boolean {
        const uuid = this._authenticationService.currentSessionIdentifier?.UUID || 'no-session';
        const lastRefreshed = localStorage.getItem('rooster-refresh-' + uuid + '-' + jaarWeek);
        const needsRefresh = !lastRefreshed || Number(lastRefreshed) + 30000 < new Date().getTime();
        if (needsRefresh) {
            localStorage.setItem('rooster-refresh-' + uuid + '-' + jaarWeek, new Date().getTime().toString());
        }
        return needsRefresh;
    }

    public set scrollableTitle(title: string | undefined) {
        this._scrollableTitleSubject.next(title);
    }

    public get scrollableTitle$() {
        return this._scrollableTitleSubject.asObservable();
    }

    public updateToonWeekendPreference(toonWeekend: boolean): void {
        Preferences.set({ key: TOON_WEEKEND_KEY, value: toonWeekend.toString() });
    }

    private async _getToonWeekendPreference(): Promise<boolean> {
        const { value } = await Preferences.get({ key: TOON_WEEKEND_KEY });
        return value === 'true';
    }

    public getToonWeekendPreference(): Observable<boolean> {
        return from(this._getToonWeekendPreference());
    }
}
