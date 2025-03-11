import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import {
    DossierType,
    GetExamendossierSamengesteldeToetsDetails,
    GetVoortgangsdossierSamengesteldeToetsDetails,
    RefreshLaatsteResultaat
} from 'leerling/store';
import { Observable } from 'rxjs';
import { LaatsteResultaat, SamengesteldeToetsDetails } from './laatsteresultaten-model';
import { LaatsteResultatenSelectors } from './laatsteresultaten-selectors';

@Injectable({
    providedIn: 'root'
})
export class LaatsteResultatenService {
    private _store = inject(Store);

    public getLaatsteResultaten(): Observable<LaatsteResultaat[] | undefined> {
        this.refreshLaatsteResultaten();

        return this._store.select(LaatsteResultatenSelectors.getLaatsteResultaten());
    }

    public getSamengesteldeToetsDetails(
        dossierType: DossierType,
        deeltoetsKolomId: number,
        isAlternatief: boolean
    ): Observable<SamengesteldeToetsDetails | undefined> {
        this._store.dispatch(
            dossierType === 'Voortgang'
                ? new GetVoortgangsdossierSamengesteldeToetsDetails(deeltoetsKolomId)
                : new GetExamendossierSamengesteldeToetsDetails(deeltoetsKolomId)
        );

        return this._store.select(LaatsteResultatenSelectors.getSamengesteldeToetsDetails(deeltoetsKolomId, isAlternatief));
    }

    public refreshLaatsteResultaten(): void {
        this._store.dispatch(new RefreshLaatsteResultaat());
    }
}
