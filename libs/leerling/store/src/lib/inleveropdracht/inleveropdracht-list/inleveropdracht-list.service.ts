import { inject, Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { SStudiewijzerItem } from '../../huiswerk/huiswerk-model';
import { RefreshInleverOpdrachtList } from './inleveropdracht-list-actions';
import { InleveropdrachtListSelectors } from './inleveropdracht-list-selectors';

@Injectable({
    providedIn: 'root'
})
export class InleveropdrachtListService {
    private _store = inject(Store);

    public getInleverOpdrachten(): Observable<SStudiewijzerItem[] | undefined> {
        this.refreshInleverOpdrachten();
        return this._store.select(InleveropdrachtListSelectors.getInleverOpdrachten());
    }

    public refreshInleverOpdrachten() {
        this._store.dispatch(new RefreshInleverOpdrachtList());
    }
}
