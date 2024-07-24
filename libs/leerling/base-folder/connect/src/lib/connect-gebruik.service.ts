import { Injectable, inject } from '@angular/core';
import Bugsnag from '@bugsnag/js';
import { AuthenticationService } from 'leerling-authentication';
import { RequestInformationBuilder, RequestService } from 'leerling-request';
import { LeermiddelType, SLeermiddel } from 'leerling/store';
import { catchError, of } from 'rxjs';

// kopie van leerling-studiemateriaal voor nu, anders moet ik ook eerst heel leermiddelen lostrekken
// TODO: vervangen door Leerling uit leermiddel-models zodra die bestaat
export interface Leermiddel {
    type: LeermiddelType;
    titel: string;
    methode?: string;
    uitgever?: string;
    uri: string;
    uuid: string;
    leermiddel: SLeermiddel;
}

@Injectable({
    providedIn: 'root'
})
export class ConnectGebruikService {
    private _requestService = inject(RequestService);
    private _authenticationService = inject(AuthenticationService);

    public registreerTekstLink(studiewijzerId: number, studiewijzerItemId: number, url: string): void {
        if (this._authenticationService.isCurrentContextOuderVerzorger) return;

        const requestInformation = new RequestInformationBuilder()
            .body({
                studiewijzerId,
                studiewijzerItemId,
                url
            })
            .build();
        this._requestService
            .put('swgebruik/switextlink', requestInformation)
            .pipe(
                catchError((error) => {
                    Bugsnag.notify(error);
                    return of();
                })
            )
            .subscribe();
    }
    public registreerExternMateriaal(studiewijzerId: number, studiewijzerItemId: number, externMateriaalId: number, url: string) {
        if (this._authenticationService.isCurrentContextOuderVerzorger) return;

        const requestInformation = new RequestInformationBuilder()
            .body({
                studiewijzerId,
                studiewijzerItemId,
                externMateriaalId,
                url
            })
            .build();
        this._requestService
            .put('swgebruik/swiextmat', requestInformation)
            .pipe(
                catchError((error) => {
                    Bugsnag.notify(error);
                    return of();
                })
            )
            .subscribe();
    }

    public registreerJaarExternMateriaal(jaarMateriaalId: number) {
        if (this._authenticationService.isCurrentContextOuderVerzorger) return;

        this._requestService
            .put<void>(`swgebruik/swjaarextmat/${jaarMateriaalId}`)
            .pipe(
                catchError((error) => {
                    Bugsnag.notify(error);
                    return of();
                })
            )
            .subscribe();
    }

    public registreerLeermiddelKeuze(leermiddelKeuzeUuid: string) {
        if (this._authenticationService.isCurrentContextOuderVerzorger) return;

        this._requestService
            .put<void>(`swgebruik/leermiddelkeuze/${leermiddelKeuzeUuid}`)
            .pipe(
                catchError((error) => {
                    Bugsnag.notify(error);
                    return of();
                })
            )
            .subscribe();
    }

    public registreerEduRoutePortalUserProduct(eduRoutePortalUserProductUuid: string) {
        if (this._authenticationService.isCurrentContextOuderVerzorger) return;

        this._requestService
            .put<void>(`swgebruik/edurouteportaluserproduct/${eduRoutePortalUserProductUuid}`)
            .pipe(
                catchError((error) => {
                    Bugsnag.notify(error);
                    return of();
                })
            )
            .subscribe();
    }

    public registreerLeermiddelGebruik(leermiddel: Leermiddel) {
        if (this._authenticationService.isCurrentContextOuderVerzorger) return;

        switch (leermiddel.type) {
            case 'INTERN_BOEKENFONDS':
                this.registreerLeermiddelKeuze(leermiddel.uuid);
                break;
            case 'PERSOONLIJK':
                this.registreerEduRoutePortalUserProduct(leermiddel.uuid);
                break;
        }
    }
}
