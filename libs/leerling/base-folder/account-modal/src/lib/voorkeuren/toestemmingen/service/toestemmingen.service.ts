import { Injectable, inject } from '@angular/core';
import { RLeerlingToestemmingen } from 'leerling-codegen';
import { RequestInformationBuilder, RequestService } from 'leerling-request';
import { Observable, firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ToestemmingenService {
    private _requestService = inject(RequestService);

    public getToestemmingen(): Observable<RLeerlingToestemmingen[]> {
        return this._requestService.unwrappedGet<RLeerlingToestemmingen>('leerlingen/toestemmingen');
    }

    public updateToestemming(leerlingId: number, veldUuid: string, waarde: boolean): void {
        firstValueFrom(
            this._requestService.putWithResponse(
                `leerlingen/${leerlingId}/toestemmingen/${veldUuid}`,
                new RequestInformationBuilder().body(waarde).build()
            )
        );
    }

    public updatePortaalToestemming(verzorgerId: number, waarde: boolean): void {
        firstValueFrom(
            this._requestService.putWithResponse(
                `leerlingen/portaaltoestemmingen/${verzorgerId}`,
                new RequestInformationBuilder().body(waarde).build()
            )
        );
    }
}
