import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { SRegistratiePeriode } from 'leerling-registraties-models';
import { MaatregelState, RefreshMaatregelen } from 'leerling/store';
import { RegistratiesState } from './state/registraties-state';
import { RefreshRegistraties, SelectTijdspan, SetIsLoading } from './state/registraties.actions';

@Injectable({ providedIn: 'root' })
export class RegistratiesService {
    private _store = inject(Store);
    refreshMaatregelen = () => this._store.dispatch(new RefreshMaatregelen());

    registratiesCategorieen = (tijdspan: SRegistratiePeriode) => this._store.select(RegistratiesState.registratieCategorieen(tijdspan));
    tijdspan = () => this._store.select(RegistratiesState.tijdspan);
    tijdspanSnapshot = () => this._store.selectSnapshot(RegistratiesState.tijdspan);
    getActieveMaatregelen = () => this._store.select(MaatregelState.actieveMaatregelen);

    selectTijdspanRefreshRegistraties(tijdspan: SRegistratiePeriode) {
        this._store.dispatch([new SelectTijdspan(tijdspan), new RefreshRegistraties()]);
    }
    setIsLoading = (isLoading: boolean) => this._store.dispatch(new SetIsLoading(isLoading));
    isLoading = () => this._store.select(RegistratiesState.isLoading);
}
