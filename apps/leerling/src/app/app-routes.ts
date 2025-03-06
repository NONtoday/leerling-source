import { importProvidersFrom, inject } from '@angular/core';
import { CanActivateFn, Router, Routes, UrlTree } from '@angular/router';
import { Network } from '@capacitor/network';
import { NgxsModule } from '@ngxs/store';
import { AuthenticationService, LoginComponent, OauthCallbackComponent } from 'leerling-authentication';
import {
    AFWEZIG_MELDEN,
    AFWEZIGHEID,
    BERICHTEN,
    BERICHTEN_POSTVAK_IN,
    CIJFERS,
    CIJFERS_OVERZICHT,
    CIJFERS_VAKGEMIDDELDEN,
    CIJFERS_VAKRESULTATEN,
    GEEN_PLAATSING,
    getRestriction,
    HomeComponent,
    LOGIN,
    OAUTH_CALLBACK,
    OUDERAVOND,
    PathWithRestrictionName,
    REDIRECT,
    ROOSTER,
    STUDIEWIJZER,
    VANDAAG
} from 'leerling-base';
import { ERROR, SupportedErrorTypes } from 'leerling-error-models';
import { ErrorComponent } from 'leerling-error-ui';
import { GeenPlaatsingComponent } from 'leerling-geen-plaatsing';
import { RedirectComponent } from 'leerling-redirect';
import { RegistratiesState } from 'leerling-registraties-data-access';
import { GuardableComponent } from 'leerling-util';
import { VandaagComponent } from 'leerling-vandaag';
import {
    CijferOverzichtComponent,
    CijfersComponent,
    LaatsteresultatenComponent,
    VakgemiddeldenComponent,
    VakresultatenComponent
} from 'leerling/resultaten';
import { RoosterComponent } from 'leerling/rooster';
import { RechtenService } from 'leerling/store';
import { StudiewijzerComponent } from 'leerling/studiewijzer';
import { catchError, from, map, Observable, of, switchMap, timeout } from 'rxjs';
import { RootRedirectComponent } from '../root-redirect/root-redirect.component';

const authGuardFn: CanActivateFn = (): Observable<boolean | UrlTree> => {
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

function getHeeftRechtOrRedirectFn(path: PathWithRestrictionName): CanActivateFn {
    const permission = getRestriction(path);

    return (): Observable<boolean | UrlTree> => {
        const router = inject(Router);
        const rechtenService = inject(RechtenService);
        return rechtenService.shouldSkipRoutePermissionCheckAndReset()
            ? of(true)
            : rechtenService.heeftRecht(permission).pipe(map((heeftRecht) => heeftRecht || router.parseUrl('/')));
    };
}

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
                component: RoosterComponent,
                canActivate: [getHeeftRechtOrRedirectFn(ROOSTER)],
                canDeactivate: [(component: GuardableComponent) => component.canDeactivate()],
                runGuardsAndResolvers: 'paramsOrQueryParamsChange'
            },
            {
                path: STUDIEWIJZER,
                component: StudiewijzerComponent,
                canActivate: [getHeeftRechtOrRedirectFn(STUDIEWIJZER)],
                canDeactivate: [(component: GuardableComponent) => component.canDeactivate()],
                runGuardsAndResolvers: 'paramsOrQueryParamsChange'
            },
            {
                path: CIJFERS,
                component: CijfersComponent,
                canActivate: [getHeeftRechtOrRedirectFn(CIJFERS)],
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
                    },
                    {
                        path: CIJFERS_OVERZICHT,
                        component: CijferOverzichtComponent
                    }
                ]
            },
            {
                path: BERICHTEN,
                redirectTo: `${BERICHTEN}/${BERICHTEN_POSTVAK_IN}`
            },
            {
                path: `${BERICHTEN}/:activeTab`,
                canActivate: [getHeeftRechtOrRedirectFn(BERICHTEN)],
                loadComponent: () => import('leerling-berichten').then((mod) => mod.BerichtenComponent),
                canDeactivate: [(component: GuardableComponent) => component.canDeactivate()],
                runGuardsAndResolvers: 'paramsOrQueryParamsChange'
            },
            {
                path: AFWEZIGHEID,
                loadComponent: () => import('leerling-feature-registraties').then((mod) => mod.RegistratieOverzichtComponent),
                providers: [importProvidersFrom(NgxsModule.forFeature([RegistratiesState]))]
            },
            {
                path: AFWEZIG_MELDEN,
                loadComponent: () => import('leerling-afwezig-melden').then((mod) => mod.AfwezigMeldenPageComponent),
                canActivate: [
                    getHeeftRechtOrRedirectFn(AFWEZIG_MELDEN),
                    () => (inject(AuthenticationService).isCurrentContextOuderVerzorger ? true : new UrlTree())
                ],
                canDeactivate: [(component: GuardableComponent) => component.canDeactivate()]
            },
            {
                path: OUDERAVOND,
                loadComponent: () => import('leerling-ouderavond').then((mod) => mod.OuderavondPageComponent),
                canActivate: [() => (inject(AuthenticationService).isCurrentContextOuderVerzorger ? true : new UrlTree())],
                canDeactivate: [(component: GuardableComponent) => component.canDeactivate()]
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
        path: GEEN_PLAATSING,
        component: GeenPlaatsingComponent
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
