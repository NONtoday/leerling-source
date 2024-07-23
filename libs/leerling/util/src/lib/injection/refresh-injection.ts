import { assertInInjectionContext, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { REloRestricties } from 'leerling-codegen';
import { RefreshReason, RefreshService } from '../services/refresh.service';

/**
 * Luistert naar wanneer er 'verder' wordt gegaan. Bijvoorbeeld bij het heropenen van de app, of wanneer er van account geswitcht wordt. Gebruik deze functie bij een onderliggend component om te
 * kunnen reageren op dit event, bijvoorbeeld voor het opnieuw ophalen van data. Voor top level components, waarbij
 * ook een rechtencheck moet worden uitgevoerd, moet de `onRefreshOrRedirectHome()` functie worden
 * gebruikt.
 */
export const onRefresh = (callback: (reason: RefreshReason) => void) => {
    assertInInjectionContext(onRefresh);
    return inject(RefreshService).onRefresh().pipe(takeUntilDestroyed()).subscribe(callback);
};

/**
 * Luistert naar wanneer er 'verder' wordt gegaan. Bijvoorbeeld bij het heropenen van de app, of wanneer er van account geswitcht wordt. Voert daarbij  een rechtencheck uit. Als er wordt geswitcht, maar
 * de vereiste rechten zijn niet aanwezig, dan wordt er een redirect uitgevoerd naar home. Gebruik deze functie
 * bij het top level component van een feature.
 */
export const onRefreshOrRedirectHome = (rechten: Array<keyof REloRestricties>, callback?: (reason: RefreshReason) => void) => {
    assertInInjectionContext(onRefreshOrRedirectHome);
    return inject(RefreshService).onRefreshOrRedirectHome(rechten).pipe(takeUntilDestroyed()).subscribe(callback);
};
