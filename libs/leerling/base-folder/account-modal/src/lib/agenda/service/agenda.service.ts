import { Injectable, inject } from '@angular/core';
import { RLeerlingICalendarLink } from 'leerling-codegen';
import { RequestService } from 'leerling-request';
import { InfoMessageService } from 'leerling-util';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AgendaService {
    private _requestService = inject(RequestService);
    private _infomessageService = inject(InfoMessageService);

    public sendCopyNotification(isCopySuccessful: boolean): void {
        if (isCopySuccessful) this._infomessageService.dispatchSuccessMessage('Link gekopieerd');
        else this._infomessageService.dispatchErrorMessage('Er ging iets mis.');
    }

    public getICalendarLink(): Observable<RLeerlingICalendarLink> {
        return this._requestService.get<RLeerlingICalendarLink>('icalendar');
    }

    public removeICalendarLink(): void {
        this._requestService.deleteWithResponse<RLeerlingICalendarLink>('icalendar').subscribe();
    }
}
