import { inject, Injectable, untracked } from '@angular/core';
import { Store } from '@ngxs/store';
import { isPresent } from 'harmony';
import { InfoMessageService } from 'leerling-util';
import {
    BerichtState,
    GetExtraOntvangersBoodschap,
    MarkeerGelezen,
    MarkeerOngelezen,
    NieuwBerichtInput,
    ReactieBerichtInput,
    RefreshConversatieOptions,
    RefreshConversaties,
    RefreshToegestaneOntvangers,
    SConversatie,
    SMedewerker,
    VerstuurNieuwBericht,
    VerstuurReactieBericht,
    VerwijderConversatie
} from 'leerling/store';

import { Observable, take } from 'rxjs';

@Injectable()
export class BerichtService {
    private _store = inject(Store);
    private _infoMessageService = inject(InfoMessageService);

    refreshConversaties = (refreshOptions?: RefreshConversatieOptions) => this._store.dispatch(new RefreshConversaties(refreshOptions));
    postvakIn = () => this._store.select(BerichtState.postvakIn);
    postvakUit = () => this._store.select(BerichtState.postvakUit);
    refreshToegestaneOntvangers = () => untracked(() => this._store.dispatch(new RefreshToegestaneOntvangers()));
    aantalOngelezenConversatiesPostvakIn = () => this._store.select(BerichtState.aantalOngelezenConversatiesPostvakIn);

    markeerGelezen(conversatie: SConversatie | undefined) {
        if (isPresent(conversatie?.datumOudsteOngelezenBoodschap)) {
            this._store.dispatch(new MarkeerGelezen(conversatie));
        }
    }

    markeerOngelezen(conversatie: SConversatie) {
        if (!isPresent(conversatie.datumOudsteOngelezenBoodschap)) {
            this._store.dispatch(new MarkeerOngelezen(conversatie));
        }
    }

    verwijderen(conversatie: SConversatie) {
        this._store.dispatch(new VerwijderConversatie(conversatie));
    }

    getToegestaneOntvangers(): Observable<SMedewerker[] | undefined> {
        this.refreshToegestaneOntvangers();
        return this._store.select(BerichtState.toegestaneOntvangers);
    }

    alleConversatiesOpgehaald(): Observable<boolean | undefined> {
        return this._store.select(BerichtState.alleConversatiesOpgehaald);
    }

    verstuurNieuwBericht(nieuwBericht: NieuwBerichtInput) {
        this._store.dispatch(new VerstuurNieuwBericht(nieuwBericht)).pipe(take(1)).subscribe(this.dispatchBerichtSuccessMessage);
    }

    verstuurReactieBericht(conversatie: SConversatie, reactieBericht: ReactieBerichtInput) {
        this._store
            .dispatch(new VerstuurReactieBericht(conversatie, reactieBericht))
            .pipe(take(1))
            .subscribe(this.dispatchBerichtSuccessMessage);
    }

    getExtraOntvangersBoodschap(conversatie: SConversatie, boodschapId: number) {
        this._store.dispatch(new GetExtraOntvangersBoodschap(conversatie, boodschapId));
    }

    private dispatchBerichtSuccessMessage = () => this._infoMessageService.dispatchSuccessMessage('Bericht verzonden!');
}
