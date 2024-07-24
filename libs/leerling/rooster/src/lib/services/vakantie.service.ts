import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { endOfDay, startOfDay } from 'date-fns';
import { RefreshVakantie, VakantieDisplay, VakantieSelectors } from 'leerling/store';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class VakantieService {
    private _store = inject(Store);

    public getVakanties(beginDatum: Date, eindDatum: Date): Observable<VakantieDisplay[]> {
        beginDatum = startOfDay(beginDatum);
        eindDatum = endOfDay(eindDatum);
        this._store.dispatch(new RefreshVakantie());

        return this._store.select(VakantieSelectors.getVakantieDisplay(beginDatum, eindDatum));
    }
}
