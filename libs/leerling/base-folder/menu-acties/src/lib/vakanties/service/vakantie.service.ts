import { Injectable, inject, untracked } from '@angular/core';
import { Store } from '@ngxs/store';
import { endOfDay, startOfDay, startOfToday } from 'date-fns';
import { RefreshVakantie, Vakantie, VakantieSelectors, getEindDatumSchooljaar, getStartDatumSchooljaar } from 'leerling/store';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class VakantieService {
    private _store = inject(Store);

    public getVakantiesHuidigSchooljaar(): Observable<Vakantie[]> {
        const vandaag = startOfToday();
        const beginDatum = startOfDay(getStartDatumSchooljaar(vandaag));
        const eindDatum = endOfDay(getEindDatumSchooljaar(vandaag));
        untracked(() => this._store.dispatch(new RefreshVakantie()));

        return this._store.select(VakantieSelectors.getVakanties(beginDatum, eindDatum));
    }
}
