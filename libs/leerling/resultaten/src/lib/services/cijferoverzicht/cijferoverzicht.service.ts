import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import {
    CijferoverzichtSelectors,
    PlaatsingService,
    RefreshExamenCijferoverzicht,
    RefreshExamendossierContexten,
    RefreshVoortgangCijferoverzicht,
    SVoortgangCijferOverzicht
} from 'leerling/store';
import { Observable } from 'rxjs';
import { CijferoverzichtExamenData, CijferoverzichtExamenSelectors } from './cijferoverzicht-examen-selectors';
import { PlaatsingEnExamenItem, PlaatsingEnExamenItemSelectors } from './plaatsing-en-examen-item-selectors';

@Injectable({
    providedIn: 'root'
})
export class CijferoverzichtService {
    private _store = inject(Store);
    private _plaatsingService = inject(PlaatsingService);

    public getVoortgangCijferoverzicht(plaatsingUuid: string): Observable<SVoortgangCijferOverzicht | undefined> {
        this.refreshVoortgangCijferoverzicht(plaatsingUuid);

        return this._store.select(CijferoverzichtSelectors.getVoortgangCijferoverzicht(plaatsingUuid));
    }

    public refreshVoortgangCijferoverzicht(plaatsingUuid: string) {
        this._store.dispatch(new RefreshVoortgangCijferoverzicht(plaatsingUuid));
    }

    public refreshExamenCijferoverzicht(plaatsingUuid: string, lichtingUuid: string | undefined) {
        this._store.dispatch(new RefreshExamenCijferoverzicht(plaatsingUuid, lichtingUuid));
    }

    public refreshPlaatsingEnExamenItems() {
        this._plaatsingService.refreshPlaatsingen();
        this._store.dispatch(new RefreshExamendossierContexten());
    }

    public getExamencijferoverzicht(
        plaatsingUuid: string,
        lichtingUuid: string | undefined
    ): Observable<CijferoverzichtExamenData | undefined> {
        this.refreshExamenCijferoverzicht(plaatsingUuid, lichtingUuid);

        return this._store.select(CijferoverzichtExamenSelectors.getExamenData(plaatsingUuid, lichtingUuid));
    }

    public getPlaatsingEnExamenItems(): Observable<PlaatsingEnExamenItem[] | undefined> {
        this.refreshPlaatsingEnExamenItems();
        return this._store.select(PlaatsingEnExamenItemSelectors.getSelectieWaarden());
    }
}
