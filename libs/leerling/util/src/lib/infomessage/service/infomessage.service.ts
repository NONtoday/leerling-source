import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Bugsnag from '@bugsnag/browser';
import { Store } from '@ngxs/store';
import { DeviceService } from 'harmony';
import { AddErrorMessage, AddInfoMessage, AddSuccessMessage, AddWarningMessage, InfoMessagesSelectors, SInfoMessage } from 'leerling/store';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class InfoMessageService {
    private _store = inject(Store);
    private _toastr = inject(ToastrService);
    private _deviceService = inject(DeviceService);

    message$: Observable<SInfoMessage | undefined> = this._store.select(InfoMessagesSelectors.getInfoMessages());

    constructor() {
        this.message$.pipe(takeUntilDestroyed()).subscribe((next) => {
            if (next && next.message) {
                this._addToast(next);
            }
        });
    }

    public dispatchWarningMessage(message: string) {
        this._store.dispatch(new AddWarningMessage(message));
    }

    public dispatchSuccessMessage(message: string) {
        this._store.dispatch(new AddSuccessMessage(message));
    }

    public dispatchInfoMessage(message: string) {
        this._store.dispatch(new AddInfoMessage(message));
    }

    public dispatchErrorMessage(message: string) {
        this._store.dispatch(new AddErrorMessage(message));
    }

    private _addToast(toast: SInfoMessage) {
        switch (toast.type) {
            case 'info':
                this._toastr.info(toast.message);
                break;
            case 'success':
                this._toastr.success(toast.message);
                break;
            case 'error':
                this._toastr.error(toast.message);
                break;
            case 'warning':
                this._toastr.warning(toast.message);
                break;
        }
    }

    public handleHttpError(httpError: HttpErrorResponse) {
        this.sendToBugsnag(httpError);
        this.dispatchErrorMessage('Kan geen gegevens ophalen uit Somtoday');
    }

    private sendToBugsnag(error: HttpErrorResponse) {
        if (error.status !== 401) {
            Bugsnag.notify(error);
        }
    }
}
