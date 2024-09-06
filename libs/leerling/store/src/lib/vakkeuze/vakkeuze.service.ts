import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { RefreshVakken } from './vakkeuze-actions';
import { RefreshVakkeuzeMetGemiddelden } from './vakkeuze-gemiddelde/vakkeuze-gemiddelde-actions';
import { SVakkeuzeGemiddelden } from './vakkeuze-gemiddelde/vakkeuze-gemiddelde-model';
import { VakkeuzeGemiddeldeSelectors } from './vakkeuze-gemiddelde/vakkeuze-gemiddelde-selectors';
import { VakkenSelectors } from './vakkeuze-selectors';

@Injectable({
    providedIn: 'root'
})
export class VakkeuzeService {
    private _store = inject(Store);

    public getVakkeuzes() {
        this.refreshVakkeuzes();
        return this._store.select(VakkenSelectors.getVakkeuzes());
    }

    public getVakkeuzesMetGemiddelden(plaatsingUuid: string): Observable<SVakkeuzeGemiddelden | undefined> {
        this._store.dispatch(new RefreshVakkeuzeMetGemiddelden(plaatsingUuid));
        return this._store.select(VakkeuzeGemiddeldeSelectors.getVakkeuzeGemiddelden(plaatsingUuid));
    }

    public refreshVakkeuzes(): void {
        this._store.dispatch(new RefreshVakken());
    }
}
