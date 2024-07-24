import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { isEmpty } from 'lodash-es';
import { Observable, filter, firstValueFrom } from 'rxjs';
import { RefreshRechten, RemoveRechten } from './rechten-action';
import { SAccountRechtenModel, SRechten } from './rechten-model';
import { AccountContextMetRechten, RechtenSelectors } from './rechten-selectors';

@Injectable({
    providedIn: 'root'
})
export class RechtenService {
    private _store = inject(Store);

    public getRechten(): Observable<SAccountRechtenModel[]> {
        this.updateRechten();
        return this._store.select(RechtenSelectors.getRechten()).pipe(filter((accounts) => !isEmpty(accounts)));
    }

    public getCurrentAccountRechten(): Observable<SRechten> {
        this.updateRechten();
        return this._store.select(RechtenSelectors.getCurrentAccountRechten()).pipe(filter((rechten) => !isEmpty(rechten)));
    }

    public getAccountContextMetRechten(): Observable<AccountContextMetRechten> {
        this.updateRechten();
        return this._store
            .select(RechtenSelectors.getAccountContextMetRechten())
            .pipe(filter((accountRechten) => !isEmpty(accountRechten.rechten)));
    }

    public getCurrentAccountRechtenSnapshot(): SRechten {
        return this._store.selectSnapshot(RechtenSelectors.getCurrentAccountRechten());
    }

    public updateRechten() {
        this._store.dispatch(new RefreshRechten());
    }

    public async updateRechtenSynchronous(): Promise<void> {
        await firstValueFrom(this._store.dispatch(new RefreshRechten()));
    }

    public removeRechten(localContextUUID: string) {
        this._store.dispatch(new RemoveRechten(localContextUUID));
    }

    public currentAccountIsVerzorger(): Observable<boolean> {
        return this._store.select(RechtenSelectors.currentAccountIsVerzorger());
    }
}
