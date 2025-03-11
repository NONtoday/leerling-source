import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofActionCompleted, Store } from '@ngxs/store';
import { isBefore } from 'date-fns';
import { isPresent } from 'harmony';
import {
    LandelijkeMededelingenSelectors,
    LandelijkeMededelingGelezen,
    RefreshLandelijkeMededelingen,
    SLandelijkeMededeling,
    SLandelijkeMededelingenAccountContext
} from 'leerling/store';
import { ActiveToast, IndividualConfig, ToastrService } from 'ngx-toastr';
import { filter, map, mergeMap, Observable, of, switchMap } from 'rxjs';

export const toastConfig: Partial<IndividualConfig> = {
    // expliciet timeOut en extendedTimeout toegevoegd want disableTimout bleek niet te werken.
    timeOut: 0,
    extendedTimeOut: 0,
    tapToDismiss: true
};

@Injectable({
    providedIn: 'root'
})
export class LandelijkeMededelingenService {
    private _store = inject(Store);
    private _toastr = inject(ToastrService);
    private _destroyRef = inject(DestroyRef);
    private actions$ = inject(Actions);

    constructor() {
        this.actions$
            .pipe(ofActionCompleted(RefreshLandelijkeMededelingen), takeUntilDestroyed())
            .subscribe(() => this.sendLandelijkeMededelingen());
    }

    public sendLandelijkeMededelingen() {
        this.getCurrentAccountLandelijkeMededelingen()
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                switchMap((account) => account?.mededelingen || []),
                filter((mededeling) => !mededeling.isGelezen && !isBefore(mededeling.eindPublicatie, new Date())),
                mergeMap((mededeling: SLandelijkeMededeling) => {
                    switch (mededeling.notificatieType) {
                        case 'Notificatie':
                        case 'Schermvullend':
                            return this._addToast(mededeling).onHidden.pipe(map(() => mededeling.id));
                        case 'ItemMarkering':
                            this._setupXPathListener(mededeling);
                            return of(undefined);
                        default:
                            return of(undefined);
                    }
                }),
                filter(isPresent)
            )
            .subscribe((id) => this.markeerLandelijkeMededelingAlsGelezen(id));
    }

    private _addToast(toast: SLandelijkeMededeling): ActiveToast<any> {
        switch (toast.notificatieNiveau) {
            case 'info':
                return this._toastr.info(toast.inhoud, toast.onderwerp, toastConfig);
            case 'success':
                return this._toastr.success(toast.inhoud, toast.onderwerp, toastConfig);
            case 'error':
                return this._toastr.error(toast.inhoud, toast.onderwerp, toastConfig);
            case 'warning':
                return this._toastr.warning(toast.inhoud, toast.onderwerp, toastConfig);
        }
    }

    private _setupXPathListener(mededeling: SLandelijkeMededeling): void {
        // doe hier coole dingen met Xpath enzo
        console.log('XPATH: ' + mededeling.xpath);
    }

    public getCurrentAccountLandelijkeMededelingen(): Observable<SLandelijkeMededelingenAccountContext | undefined> {
        return this._store.select(LandelijkeMededelingenSelectors.getCurrentAccountLandelijkeMededelingen());
    }

    public markeerLandelijkeMededelingAlsGelezen(mededelingId: number): void {
        this._store.dispatch(new LandelijkeMededelingGelezen(mededelingId));
    }

    public refreshLandelijkeMededelingen() {
        this._store.dispatch(new RefreshLandelijkeMededelingen());
    }
}
