import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { REloRestricties } from 'leerling-codegen';
import { AccountContextMetRechten, RechtenSelectors, SRechten } from 'leerling/store';
import { isEqual } from 'lodash-es';
import { Observable, Subject, distinctUntilChanged, filter, map, merge, pairwise, startWith } from 'rxjs';

export interface AccountContextSwitchedInfo {
    accountChanged: boolean;
    leerlingChanged: boolean;
    localAccountContext: string;
    leerlingId: number;
    rechten: SRechten;
}

export enum RefreshReason {
    RESUME,
    LEERLING_SWITCH
}

@Injectable({
    providedIn: 'root'
})
export class RefreshService {
    private _router = inject(Router);
    private _store: Store = inject(Store);

    private _resuming$ = new Subject<void>();

    /**
     * Luistert naar wanneer er 'verder' wordt gegaan.
     * Bijvoorbeeld bij het heropenen van de app, of wanneer er van account geswitcht wordt.
     * Gebruik deze methode bij een onderliggend component om te kunnen reageren op dit event,
     * bijvoorbeeld voor het opnieuw ophalen van data. Voor top level components,
     * waarbij ook een rechtencheck moet worden uitgevoerd,
     * moet de `onResumeRefreshOrRedirectHome()` methode worden gebruikt.
     */
    onRefresh(): Observable<RefreshReason> {
        return merge(
            this._resuming$.asObservable().pipe(map(() => RefreshReason.RESUME)),
            this._store.select(RechtenSelectors.getAccountContextMetRechten()).pipe(
                // voorkom dubbele waardes
                distinctUntilChanged(isEqual),
                // alleen doorgaan als de benodigde data aanwezig is
                filter((context) => !!context?.rechten && !!context?.leerlingId),
                // ontvang de vorige en de huidige emitted value
                pairwise(),
                // bouw info object
                map(
                    ([previous, current]: [AccountContextMetRechten, Required<AccountContextMetRechten>]): AccountContextSwitchedInfo => ({
                        accountChanged: previous?.localAuthenticationContext !== current.localAuthenticationContext,
                        leerlingChanged: previous?.leerlingId !== current.leerlingId,
                        leerlingId: current.leerlingId,
                        localAccountContext: current.localAuthenticationContext,
                        rechten: current.rechten
                    })
                ),
                // alleen doorgaan als de leerling of account veranderd is
                filter((info) => info.accountChanged || info.leerlingChanged),
                // 'We zijn geswitcht -> geef aan de trigger vanuit een leerlingswitch komt'
                map(() => RefreshReason.LEERLING_SWITCH)
            )
        );
    }

    /**
     * Luistert naar wanneer er 'verder' wordt gegaan. Bijvoorbeeld bij het heropenen van de app, of wanneer er van account geswitcht wordt.
     * Voert daarbij  een rechtencheck uit. Als er wordt geswitcht, maar
     * de vereiste rechten zijn niet aanwezig, dan wordt er een redirect uitgevoerd naar home. Gebruik deze methode
     * bij het top level component van een feature.
     *
     * @param rechten De benodigde rechten voor de feature.
     * @returns void Deze observable emit enkel als de context is veranderd én de juiste rechten aanwezig zijn.
     */
    onRefreshOrRedirectHome(rechten: Array<keyof REloRestricties>): Observable<RefreshReason> {
        return merge(
            this._resuming$.asObservable().pipe(map(() => RefreshReason.RESUME)),
            this._store.select(RechtenSelectors.getAccountContextMetRechten()).pipe(
                // alleen doorgaan als de benodigde data aanwezig is
                filter((context) => !!context?.leerlingId && !!context?.rechten),
                // dit is in dit scenario nodig in combinatie met pairwise
                startWith(undefined),
                // ontvang de vorige en de huidige emitted value
                pairwise(),
                // alleen doorgaan als de vereiste rechten aanwezig zijn
                filter(([, current]: [Required<AccountContextMetRechten>, Required<AccountContextMetRechten>]) => {
                    const heeftRechten = rechten.every((recht) => current.rechten[recht]);
                    if (!heeftRechten) {
                        // huidige account heeft niet de vereiste rechten: redirect naar home
                        this._router.navigate(['']);
                    }
                    return heeftRechten;
                }),
                // alleen doorgaan als de leerling of account veranderd is
                filter(
                    ([previous, current]) =>
                        (previous && previous.leerlingId !== current.leerlingId) ||
                        (previous && previous.localAuthenticationContext !== current.localAuthenticationContext)
                ),
                // 'We zijn geswitcht -> geef aan de trigger vanuit een leerlingswitch komt'
                map(() => RefreshReason.LEERLING_SWITCH)
            )
        );
    }

    public resuming(): void {
        this._resuming$.next();
    }
}
