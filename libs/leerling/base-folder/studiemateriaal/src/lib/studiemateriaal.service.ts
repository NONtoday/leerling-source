import { Injectable, inject, untracked } from '@angular/core';
import Bugsnag from '@bugsnag/js';
import { Store } from '@ngxs/store';
import { isPresent } from 'harmony';
import { AuthenticationService } from 'leerling-authentication';
import { LesstofModel } from 'leerling-lesstof';
import { sortLocale } from 'leerling-util';
import {
    RefreshEduRoutePortalProducts,
    RefreshStudiemateriaal,
    RefreshVakkenMetStudiemateriaal,
    SVak,
    StudiemateriaalSelectors
} from 'leerling/store';
import { Observable, filter, map, of } from 'rxjs';
import { JaarbijlagenModel, Leermiddel, LeermiddelModel, Studiemateriaal } from './studiemateriaal-frontend-model';
import { StudiemateriaalFrontendSelectors } from './studiemateriaal-frontend-selectors';

export interface StudiemateriaalViewmodel {
    isReady: boolean;
    lesstof: LesstofModel | undefined;
    leermiddelen: LeermiddelModel | undefined;
    jaarbijlagen: JaarbijlagenModel | undefined;
    heeftLesstof: boolean;
    heeftLeermiddelen: boolean;
    heeftJaarbijlagen: boolean;
    heeftGeenStudiemateriaal: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class StudiemateriaalService {
    private _authenticationService = inject(AuthenticationService);
    private _store = inject(Store);

    public getVakkenMetStudiemateriaal(): Observable<SVak[] | undefined> {
        this._refreshVakkenMetStudiemateriaal();
        return this._store.select(StudiemateriaalSelectors.getVakkenMetStudiemateriaal()).pipe(
            filter(isPresent),
            map((items) => sortLocale(items, ['naam']))
        );
    }

    public getStudiemateriaal(
        vakUuid: string | undefined,
        lesgroepUuid: string | undefined,
        aantalLesstofItems: number
    ): Observable<Studiemateriaal | undefined> {
        const uuid = vakUuid ?? lesgroepUuid;
        if (!uuid) {
            Bugsnag.notify(new Error('Studiemateriaal wordt opgevraagd zonder vak of lesgroep'));
            return of({
                lesstof: undefined,
                leermiddelen: undefined,
                jaarbijlagen: undefined
            });
        }

        this.refreshStudiemateriaal(vakUuid, lesgroepUuid);
        return this._store.select(StudiemateriaalFrontendSelectors.getStudiemateriaal(vakUuid, lesgroepUuid, aantalLesstofItems));
    }

    public getAlgemeneLeermiddelen(): Observable<Leermiddel[] | undefined> {
        this.refreshEduroutePortalProducts();
        return this._store.select(StudiemateriaalFrontendSelectors.getAlgemeneLeermiddelen());
    }

    private refreshStudiemateriaal(vakUuid: string | undefined, lesgroepUuid: string | undefined) {
        // TODO: untracked eruit schrijven? -> SLL-1780
        untracked(() => this._store.dispatch(new RefreshStudiemateriaal(vakUuid, lesgroepUuid)));
        this.refreshEduroutePortalProducts();
    }

    private refreshEduroutePortalProducts() {
        // TODO: untracked eruit schrijven? -> SLL-1780
        untracked(() => this._store.dispatch(new RefreshEduRoutePortalProducts(this._authenticationService.isCurrentContextLeerling)));
    }

    private _refreshVakkenMetStudiemateriaal() {
        this._store.dispatch(new RefreshVakkenMetStudiemateriaal());
    }
}
