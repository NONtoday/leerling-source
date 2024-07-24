import { importProvidersFrom, inject } from '@angular/core';
import { Router, Routes, UrlTree } from '@angular/router';
import { Network } from '@capacitor/network';
import { NgxsModule } from '@ngxs/store';
import type { AfwezigMeldenPageComponent } from 'leerling-afwezig-melden';
import { AuthenticationService, LoginComponent, OauthCallbackComponent } from 'leerling-authentication';
import {
    AFWEZIG_MELDEN,
    BERICHTEN,
    BERICHTEN_POSTVAK_IN,
    CIJFERS,
    CIJFERS_VAKGEMIDDELDEN,
    CIJFERS_VAKRESULTATEN,
    HomeComponent,
    LOGIN,
    OAUTH_CALLBACK,
    REDIRECT,
    REGISTRATIES,
    ROOSTER,
    STUDIEWIJZER,
    VANDAAG
} from 'leerling-base';
import type { BerichtenComponent } from 'leerling-berichten';
import { ERROR, SupportedErrorTypes } from 'leerling-error-models';
import { ErrorComponent } from 'leerling-error-ui';
import { RedirectComponent } from 'leerling-redirect';
import { RegistratiesState } from 'leerling-registraties-data-access';
import { VandaagComponent } from 'leerling-vandaag';
import { CijfersComponent, LaatsteresultatenComponent, VakgemiddeldenComponent, VakresultatenComponent } from 'leerling/resultaten';
import { RoosterComponent } from 'leerling/rooster';
import { StudiewijzerComponent } from 'leerling/studiewijzer';
import { Observable, catchError, from, map, of, switchMap, timeout } from 'rxjs';
import { RootRedirectComponent } from '../root-redirect/root-redirect.component';

const authGuardFn = (): Observable<boolean | UrlTree> => {
    const router = inject(Router);
    const authService = inject(AuthenticationService);
    /* hier loader activeren */
    return from(authService.isLoggedIn).pipe(
        map((isLoggedIn) => /* hier loader deactiveren */ isLoggedIn || router.parseUrl('login')),
        timeout(5000),
        catchError(() => {
            return from(Network.getStatus()).pipe(
                switchMap(() => {
                    return of(authService.isCurrentContextLoggedIn ? true : router.parseUrl('error?type=' + SupportedErrorTypes.IDP_DOWN));
                })
            );
        })
    );
};

export const routes: Routes = [
    {
        path: '',
        canActivate: [authGuardFn],
        canActivateChild: [authGuardFn],
        component: HomeComponent,
        children: [
            {
                path: '',
                pathMatch: 'full',
                component: RootRedirectComponent
            },
            {
                path: VANDAAG,
                component: VandaagComponent
            },
            {
                path: ROOSTER,
                component: RoosterComponent
            },
            {
                path: STUDIEWIJZER,
                component: StudiewijzerComponent
            },
            {
                path: CIJFERS,
                component: CijfersComponent,
                children: [
                    {
                        path: '',
                        component: LaatsteresultatenComponent
                    },
                    {
                        path: CIJFERS_VAKGEMIDDELDEN,
                        component: VakgemiddeldenComponent
                    },
                    {
                        path: CIJFERS_VAKRESULTATEN,
                        component: VakresultatenComponent
                    }
                ]
            },
            {
                path: BERICHTEN,
                redirectTo: `${BERICHTEN}/${BERICHTEN_POSTVAK_IN}`
            },
            {
                path: `${BERICHTEN}/:activeTab`,
                loadComponent: () => import('leerling-berichten').then((mod) => mod.BerichtenComponent),
                canDeactivate: [(component: BerichtenComponent) => component.canDeactivate()],
                runGuardsAndResolvers: 'paramsOrQueryParamsChange'
            },
            {
                path: REGISTRATIES,
                loadComponent: () => import('leerling-feature-registraties').then((mod) => mod.RegistratieOverzichtComponent),
                providers: [importProvidersFrom(NgxsModule.forFeature([RegistratiesState]))]
            },
            {
                path: AFWEZIG_MELDEN,
                loadComponent: () => import('leerling-afwezig-melden').then((mod) => mod.AfwezigMeldenPageComponent),
                canActivate: [() => inject(AuthenticationService).isCurrentContextOuderVerzorger],
                canDeactivate: [(component: AfwezigMeldenPageComponent) => component.canDeactivate()]
            }
        ]
    },
    {
        path: LOGIN,
        component: LoginComponent
    },
    {
        path: `${LOGIN}/splash`,
        redirectTo: `/${LOGIN}?splash=true`
    },
    {
        path: `${REDIRECT}`,
        component: RedirectComponent
    },
    {
        path: OAUTH_CALLBACK,
        component: OauthCallbackComponent
    },
    {
        path: ERROR,
        component: ErrorComponent
    },
    {
        // Toon error pagina bij onbekende route zodat je niet op een lege pagina komt
        path: '**',
        redirectTo: ERROR
    }
];
