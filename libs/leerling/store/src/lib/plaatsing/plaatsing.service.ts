import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { RefreshPlaatsing, RefreshSchoolgegevens } from './plaatsing-actions';
import { SPlaatsing, SVestiging } from './plaatsing-model';
import { PlaatsingSelectors } from './plaatsing-selectors';

@Injectable({
    providedIn: 'root'
})
export class PlaatsingService {
    private _store = inject(Store);

    public getPlaatsingen(): Observable<SPlaatsing[] | undefined> {
        this.refreshPlaatsingen();
        return this._store.select(PlaatsingSelectors.getPlaatsingen());
    }

    public getPlaatsing(peildatum: Date): Observable<SPlaatsing | undefined> {
        this.refreshPlaatsingen();
        return this._store.select(PlaatsingSelectors.getPlaatsing(peildatum));
    }

    public isHuidigePlaatsing(plaatsingUuid: string): boolean {
        const plaatsing = this._store.selectSnapshot(PlaatsingSelectors.getPlaatsing(new Date()));
        if (!plaatsing) return false;

        return plaatsing.UUID === plaatsingUuid;
    }

    public getHuidigeVestiging(): Observable<SVestiging | undefined> {
        this._store.dispatch(new RefreshSchoolgegevens());
        return this._store.select(PlaatsingSelectors.getHuidigeVestiging());
    }

    public refreshPlaatsingen(): void {
        this._store.dispatch(new RefreshPlaatsing());
    }
}

export function getPlaatsingOmschrijving(plaatsing: SPlaatsing): string {
    return `Leerjaar ${plaatsing.leerjaar} - ${plaatsing.schooljaarnaam}`;
}
