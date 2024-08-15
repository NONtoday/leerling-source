import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';

export const VANDAAG = 'vandaag';
export const ROOSTER = 'rooster';
export const STUDIEWIJZER = 'studiewijzer';
export const CIJFERS = 'cijfers';
export const CIJFERS_VAKGEMIDDELDEN = 'vakgemiddelden';
export const CIJFERS_VAKRESULTATEN = 'vakresultaten';
export const BERICHTEN = 'berichten';
export const BERICHTEN_POSTVAK_IN = 'postvak-in';
export const BERICHTEN_VERZONDEN_ITEMS = 'verzonden-items';
export const BERICHTEN_NIEUW = 'nieuw';
export const BERICHTEN_EDIT = 'edit';
export const LOGIN = 'login';
export const REGISTRATIES = 'registraties';
export const AFWEZIG_MELDEN = 'leerling-afwezig-melden';
export const GEEN_PLAATSING = 'geen-plaatsing';

export const REDIRECT = 'redirect';
export const OAUTH_CALLBACK = 'oauth/callback';

export const VAKRESULTATEN_PARAMETERS = {
    VAK_UUID: 'vak',
    LICHTING_UUID: 'lichting',
    PLAATSING_UUID: 'plaatsing',
    ACTIEVE_TAB: 'tab',
    VAK_NAAM: 'vaknaam'
};

export const VAKRESULATEN_BACK_URL = 'VakresultatenBackUrl';

@Injectable({
    providedIn: 'root'
})
export class RouterService {
    private _router = inject(Router);
    private _activatedRoute = inject(ActivatedRoute);

    public routeToCijfers() {
        this._router.navigate([`/${CIJFERS}`]);
    }

    public routeToBerichten() {
        this._router.navigate([`/${BERICHTEN}`]);
    }

    public routeToRegistraties() {
        this._router.navigate([`/${REGISTRATIES}`]);
    }

    public routeToCijfersVakresultaten(
        vakUuid: string,
        lichtingUuid: string,
        plaatsingUuid?: string,
        actieveTab?: string,
        vakNaamFallback?: string
    ) {
        const queryParams: Params = {};
        queryParams[VAKRESULTATEN_PARAMETERS.VAK_UUID] = vakUuid;
        queryParams[VAKRESULTATEN_PARAMETERS.LICHTING_UUID] = lichtingUuid;
        if (plaatsingUuid) {
            queryParams[VAKRESULTATEN_PARAMETERS.PLAATSING_UUID] = plaatsingUuid;
        }

        if (actieveTab) {
            queryParams[VAKRESULTATEN_PARAMETERS.ACTIEVE_TAB] = actieveTab;
        }

        if (vakNaamFallback) {
            queryParams[VAKRESULTATEN_PARAMETERS.VAK_NAAM] = vakNaamFallback;
        }

        this._router.navigate([`/${CIJFERS}/${CIJFERS_VAKRESULTATEN}`], {
            queryParams: queryParams
        });

        Preferences.set({ key: VAKRESULATEN_BACK_URL, value: this._router.url });
    }

    public getParameter(naam: string): string | undefined {
        return this._activatedRoute.snapshot.queryParamMap.get(naam) || undefined;
    }
}
