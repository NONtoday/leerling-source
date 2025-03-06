import { Injectable, inject, signal } from '@angular/core';
import { Store } from '@ngxs/store';
import { REloRestricties } from 'leerling-codegen';
import { isEmpty } from 'lodash-es';
import { Observable, filter, firstValueFrom } from 'rxjs';
import { InitializeRechten, RefreshRechten, RemoveRechten } from './rechten-action';
import { SAccountRechtenModel, SRechten } from './rechten-model';
import { AccountContextMetRechten, RechtenSelectors } from './rechten-selectors';

@Injectable({
    providedIn: 'root'
})
export class RechtenService {
    private _store = inject(Store);

    private _skipRoutePermissionCheck = signal(false);

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

    public getAccountContextMetRechtenSnapshot(): AccountContextMetRechten {
        return this._store.selectSnapshot(RechtenSelectors.getAccountContextMetRechten());
    }

    public getCurrentAccountRechtenSnapshot(): SRechten {
        return this._store.selectSnapshot(RechtenSelectors.getCurrentAccountRechten());
    }

    public isCurrentAccountImpersonatedSnapshot(): boolean {
        return this._store.selectSnapshot(RechtenSelectors.isCurrentAccountImpersonated());
    }

    public isCurrentAccountImpersonated(): Observable<boolean> {
        return this._store.select(RechtenSelectors.isCurrentAccountImpersonated());
    }

    public heeftRechtSnapshot(recht: keyof REloRestricties): boolean {
        return this._store.selectSnapshot(RechtenSelectors.heeftRecht(recht));
    }

    public heeftRecht(recht: keyof REloRestricties): Observable<boolean> {
        this.updateRechten();
        return this._store.select(RechtenSelectors.heeftRecht(recht));
    }

    public updateRechten() {
        this._store.dispatch(new RefreshRechten());
    }

    public forceUpdateRechten() {
        this._store.dispatch(new RefreshRechten(true));
    }

    public async updateRechtenSynchronous(): Promise<void> {
        await firstValueFrom(this._store.dispatch(new RefreshRechten()));
    }

    public async initializeRechtenSynchronous(accountContextID: string | undefined): Promise<void> {
        if (!accountContextID) {
            return;
        }
        await firstValueFrom(this._store.dispatch(new InitializeRechten(accountContextID)));
    }

    public removeRechten(localContextUUID: string) {
        this._store.dispatch(new RemoveRechten(localContextUUID));
    }

    public currentAccountIsVerzorger(): Observable<boolean> {
        return this._store.select(RechtenSelectors.currentAccountIsVerzorger());
    }

    public skipRoutePermissionCheck() {
        this._skipRoutePermissionCheck.set(true);
    }

    public shouldSkipRoutePermissionCheckAndReset() {
        const result = this._skipRoutePermissionCheck();
        this._skipRoutePermissionCheck.set(false);
        return result;
    }
}
