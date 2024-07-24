import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { AbsentieState, RefreshAbsentieRedenen, SAbsentieMeldingInvoer, VerstuurAbsentieMelding } from 'leerling/store';

@Injectable()
export class AbsentieService {
    private store = inject(Store);

    absentieRedenen = (vestigingId: number) => {
        this.refreshAbsentieRedenen(vestigingId);
        return this.store.select(AbsentieState.absentieRedenen);
    };

    refreshAbsentieRedenen = (vestigingId: number) => this.store.dispatch(new RefreshAbsentieRedenen(vestigingId));

    verstuurAbsentieMelding = (absentieMeldingInvoer: SAbsentieMeldingInvoer) =>
        this.store.dispatch(new VerstuurAbsentieMelding(absentieMeldingInvoer));
}
