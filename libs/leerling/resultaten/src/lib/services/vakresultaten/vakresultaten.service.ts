import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import {
    DossierType,
    GetExamendossierDeeltoetsen,
    GetVoortgangsdossierDeeltoetsen,
    PlaatsingService,
    RefreshVakResultaat,
    SGeldendResultaat,
    VakResultaatSelectors
} from 'leerling/store';
import { Observable } from 'rxjs';
import { VakToetsdossier } from './vakresultaten-model';
import { VakResultatenSelectors } from './vakresultaten-selectors';

@Injectable({
    providedIn: 'root'
})
export class VakResultatenService {
    private _store = inject(Store);
    private _plaatsingService = inject(PlaatsingService);

    public getVakToetsdossier(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string): Observable<VakToetsdossier | undefined> {
        if (plaatsingUuid && this._plaatsingService.isHuidigePlaatsing(plaatsingUuid)) {
            // huidige plaatsing hoeft niet te worden meegegeven.
            // Om dingen in de store zo veel mogelijk her te gebruiken, laten we de huidige plaatsing altijd achterwege.
            plaatsingUuid = undefined;
        }

        this._store.dispatch(new RefreshVakResultaat(vakUuid, lichtingUuid, plaatsingUuid));
        return this._store.select(VakResultatenSelectors.getVakToetsdossier(vakUuid, lichtingUuid, plaatsingUuid));
    }

    public getSamengesteldeToetsDetails(
        dossierType: DossierType,
        samengesteldeToetskolomId: number,
        plaatsingUuid?: string
    ): Observable<SGeldendResultaat[] | undefined> {
        this._store.dispatch(
            dossierType === 'Voortgang'
                ? new GetVoortgangsdossierDeeltoetsen(plaatsingUuid, samengesteldeToetskolomId)
                : new GetExamendossierDeeltoetsen(plaatsingUuid, samengesteldeToetskolomId)
        );
        return this._store.select(VakResultaatSelectors.getDeeltoetsen(samengesteldeToetskolomId, dossierType));
    }
}
