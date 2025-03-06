import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { shareReplayLastValue } from 'harmony';
import { BerichtState, RechtenService } from 'leerling/store';
import { isEqual } from 'lodash-es';
import { Observable, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { AFWEZIGHEID_TAB, BERICHTEN_TAB, CIJFERS_TAB, ROOSTER_TAB, STUDIEWIJZER_TAB, TabItem, VANDAAG_TAB } from '../../tab-item/tab-item';

@Injectable({
    providedIn: 'root'
})
export class TabBarService {
    private rechtenService = inject(RechtenService);
    private store = inject(Store);

    public items$: Observable<TabItem[]> = this.rechtenService.getCurrentAccountRechten().pipe(
        distinctUntilChanged(isEqual),
        switchMap((rechten): Observable<number> => {
            if (rechten.berichtenBekijkenAan) {
                return this.store.select(BerichtState.aantalOngelezenConversatiesPostvakIn);
            }
            return of(0);
        }),
        map((aantalOngelezenConversaties) => [
            VANDAAG_TAB,
            ROOSTER_TAB,
            STUDIEWIJZER_TAB,
            CIJFERS_TAB,
            AFWEZIGHEID_TAB,
            {
                ...BERICHTEN_TAB,
                ...(aantalOngelezenConversaties > 0 && {
                    counter: {
                        count: aantalOngelezenConversaties,
                        label: aantalOngelezenConversaties === 1 ? 'ongelezen bericht' : 'ongelezen berichten'
                    }
                })
            }
        ]),
        shareReplayLastValue()
    );
}
