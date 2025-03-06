import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { getJaarWeek } from 'leerling/store';

export const VANDAAG = 'vandaag';
export const ROOSTER = 'rooster';
export const STUDIEWIJZER = 'studiewijzer';
export const CIJFERS = 'cijfers';
export const CIJFERS_RESULTAATITEM = 'resultaatitem';
export const CIJFERS_VAKGEMIDDELDEN = 'vakgemiddelden';
export const CIJFERS_VAKRESULTATEN = 'vakresultaten';
export const CIJFERS_OVERZICHT = 'overzicht';
export const BERICHTEN = 'berichten';
export const BERICHTEN_POSTVAK_IN = 'postvak-in';
export const BERICHTEN_VERZONDEN_ITEMS = 'verzonden-items';
export const BERICHTEN_NIEUW = 'nieuw';
export const BERICHTEN_EDIT = 'edit';
export const LOGIN = 'login';
export const AFWEZIGHEID = 'afwezigheid';
export const AFWEZIG_MELDEN = 'afwezigheid/melden';
export const GEEN_PLAATSING = 'geen-plaatsing';
export const OUDERAVOND = 'ouderavond/:id';

export const REDIRECT = 'redirect';
export const OAUTH_CALLBACK = 'oauth/callback';

export const VAKRESULTATEN_PARAMETERS = {
    VAK_UUID: 'vak',
    LICHTING_UUID: 'lichting',
    PLAATSING_UUID: 'plaatsing',
    ACTIEVE_TAB: 'tab',
    VAK_NAAM: 'vaknaam'
};

export const STUDIEWIJZER_PARAMETERS = {
    STUDIEWIJZER_ITEM: 'swi',
    STUDIEWIJZER_ITEM_JAARWEEK: 'swijaarweek',
    STUDIEWIJZER_TAB: 'tab',
    PEILDATUM: 'peildatum',
    PEILDATUM_TRIGGER: 'trigger'
};

export const BERICHT_PARAMETERS = {
    CONVERSATIE: 'conversatie'
};

export const STUDIEWIJZER_PEILDATUM_DATUMFORMAT = 'yyyy-MM-dd';

export type StudiewijzerInleverperiodeTab = 'Instructie' | 'Inleveren' | 'Reacties';

export const VAKRESULATEN_BACK_URL = 'VakresultatenBackUrl';

@Injectable({
    providedIn: 'root'
})
export class RouterService {
    private _router = inject(Router);
    private _activatedRoute = inject(ActivatedRoute);

    public routeToCijfers(resultaatItemId?: number) {
        const queryParams: Params = {};
        queryParams[CIJFERS_RESULTAATITEM] = resultaatItemId;

        this._router.navigate([`/${CIJFERS}`], { queryParams: queryParams });
    }

    public routeToStudiewijzer(studiewijzeritemId?: number, peildatum?: Date, tab?: StudiewijzerInleverperiodeTab) {
        const queryParams: Params = {};

        if (studiewijzeritemId) {
            queryParams[STUDIEWIJZER_PARAMETERS.STUDIEWIJZER_ITEM] = studiewijzeritemId;
        }

        if (tab) {
            queryParams[STUDIEWIJZER_PARAMETERS.STUDIEWIJZER_TAB] = tab;
        }

        if (peildatum) {
            queryParams[STUDIEWIJZER_PARAMETERS.STUDIEWIJZER_ITEM_JAARWEEK] = getJaarWeek(peildatum);
        }

        this._router.navigate([`/${STUDIEWIJZER}`], { queryParams: queryParams, queryParamsHandling: 'merge' });
    }

    public routeToBerichten(berichtConversatieId?: number) {
        const queryParams: Params = {};
        queryParams[BERICHT_PARAMETERS.CONVERSATIE] = berichtConversatieId;

        this._router.navigate([`/${BERICHTEN}/${BERICHTEN_POSTVAK_IN}`], { queryParams: queryParams });
    }

    public routeToAfwezigheid() {
        this._router.navigate([`/${AFWEZIGHEID}`]);
    }

    public routeToAbsentieMelden() {
        this._router.navigate([`/${AFWEZIG_MELDEN}`]);
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

    public get router() {
        return this._router;
    }
}
