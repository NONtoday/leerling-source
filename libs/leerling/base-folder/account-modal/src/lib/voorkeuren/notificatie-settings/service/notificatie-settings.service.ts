import { Injectable, inject } from '@angular/core';
import { info } from 'debugger';
import { RAccountNotificationSettings } from 'leerling-codegen';
import { RequestInformationBuilder, RequestService } from 'leerling-request';
import { Observable, firstValueFrom, map } from 'rxjs';

export interface NotificatieSettings {
    leerlingAppAbsentieMeldingen: boolean;
    leerlingAppBerichtenMeldingen: boolean;
    leerlingAppResultatenMeldingen: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class NotificatieSettingsService {
    private _requestService = inject(RequestService);

    public getNotificatieSettings(): Observable<NotificatieSettings> {
        return this._requestService
            .unwrappedGet<RAccountNotificationSettings>('accountsettings')
            .pipe(map((settings) => settings[0] as NotificatieSettings));
    }

    public putNotificatieSettings(settings: NotificatieSettings): void {
        info(JSON.stringify(settings));

        firstValueFrom(
            this._requestService.put<RAccountNotificationSettings>(
                'accountsettings',
                new RequestInformationBuilder().body(settings satisfies RAccountNotificationSettings).build()
            )
        );
    }
}
