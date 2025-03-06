import { Injectable, inject } from '@angular/core';
import { AuthenticationService } from 'leerling-authentication';
import { RLeerlingToestemmingen } from 'leerling-codegen';
import { RequestInformationBuilder, RequestService } from 'leerling-request';
import { Observable, Subject, firstValueFrom, startWith, switchMap, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ToestemmingenService {
    private _requestService = inject(RequestService);
    private _authenticationService = inject(AuthenticationService);
    public isVerzorger = this._authenticationService.isCurrentContextOuderVerzorger;

    private _refreshToestemmingen = new Subject<void>();

    public getToestemmingen(): Observable<RLeerlingToestemmingen[]> {
        return this._refreshToestemmingen.pipe(
            startWith(null),
            switchMap(() => this._requestService.unwrappedGet<RLeerlingToestemmingen>('leerlingen/toestemmingen'))
        );
    }

    public updateToestemming(leerlingId: number, veldUuid: string, waarde: boolean): void {
        firstValueFrom(
            this._requestService
                .putWithResponse(`leerlingen/${leerlingId}/toestemmingen/${veldUuid}`, new RequestInformationBuilder().body(waarde).build())
                .pipe(tap(() => this._refreshToestemmingen.next()))
        );
    }

    public updatePortaalToestemming(verzorgerId: number, waarde: boolean): void {
        firstValueFrom(
            this._requestService
                .putWithResponse(`leerlingen/portaaltoestemmingen/${verzorgerId}`, new RequestInformationBuilder().body(waarde).build())
                .pipe(tap(() => this._refreshToestemmingen.next()))
        );
    }
}
