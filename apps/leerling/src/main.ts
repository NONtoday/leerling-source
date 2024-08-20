import { ApplicationConfig, ErrorHandler, enableProdMode, importProvidersFrom, signal } from '@angular/core';

import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations, provideNoopAnimations } from '@angular/platform-browser/animations';
import {
    PreloadAllModules,
    provideRouter,
    withComponentInputBinding,
    withInMemoryScrolling,
    withPreloading,
    withRouterConfig
} from '@angular/router';
import Bugsnag from '@bugsnag/js';
import { BugsnagErrorHandler } from '@bugsnag/plugin-angular';
import { Capacitor } from '@capacitor/core';
import { withNgxsReduxDevtoolsPlugin } from '@ngxs/devtools-plugin';
import { withNgxsStoragePlugin } from '@ngxs/storage-plugin';
import { provideStore } from '@ngxs/store';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { ToastComponent, appViewContainerRefProvider } from 'harmony';
import { APP_SPINNER } from 'leerling-authentication';
import { environment } from 'leerling-environment';
import { disableAnimations, isWeb } from 'leerling-util';
import {
    AbsentieState,
    AfspraakState,
    BerichtState,
    CallState,
    HuiswerkState,
    InfoMessageState,
    LaatsteResultaatState,
    MaatregelState,
    PlaatsingState,
    PushActionState,
    RechtenState,
    SamengesteldeToetsDetailsState,
    SharedState,
    StudiemateriaalState,
    VakResultaatState,
    VakantieState,
    VakkeuzeGemiddeldeState,
    VakkeuzeState,
    datumReviver,
    nxgsStorageKeys,
    saveHuidigeWekenBereik
} from 'leerling/store';
import { quicklinkProviders } from 'ngx-quicklink';
import { provideToastr } from 'ngx-toastr';
import { LEERLING_VERSION } from 'version-generator';
import { routes } from './app/app-routes';
import { AppComponent } from './app/app.component';
import { authInterceptorFn, errorInterceptorFn } from './app/http-interceptors';

Bugsnag.start({
    apiKey: '8ae1f97765d162512dea7dc8927276e3',
    appType: Capacitor.getPlatform(),
    appVersion: LEERLING_VERSION,
    releaseStage: isWeb() ? environment.config.toString() : 'native',
    enabledReleaseStages: ['nightly', 'acceptatie', 'test', 'inkijk', 'inkijk2', 'productie', 'native'],
    enabledBreadcrumbTypes: environment.production ? [] : ['error', 'navigation', 'request', 'user'],
    collectUserIp: false,
    onError: (event) => {
        if (event.originalError instanceof HttpErrorResponse && event.originalError.status === 401) {
            return false;
        }
        return;
    }
});

if (environment.production) {
    enableProdMode();
}

const animationPovider = disableAnimations() ? provideNoopAnimations() : provideAnimations();

const appConfig: ApplicationConfig = {
    providers: [
        importProvidersFrom(BrowserModule),
        {
            provide: ErrorHandler,
            useFactory() {
                return new BugsnagErrorHandler();
            }
        },
        provideStore(
            [
                AfspraakState,
                CallState,
                HuiswerkState,
                InfoMessageState,
                LaatsteResultaatState,
                PlaatsingState,
                StudiemateriaalState,
                PushActionState,
                SamengesteldeToetsDetailsState,
                SharedState,
                VakkeuzeGemiddeldeState,
                VakResultaatState,
                VakantieState,
                RechtenState,
                VakkeuzeState,
                BerichtState,
                MaatregelState,
                AbsentieState
            ],
            {
                developmentMode: !environment.production,
                selectorOptions: {
                    // These Selector Settings are recommended in preparation for NGXS v4
                    suppressErrors: false,
                    injectContainerState: false
                }
            },
            withNgxsReduxDevtoolsPlugin({ disabled: environment.production }),
            withNgxsStoragePlugin({
                keys: nxgsStorageKeys,
                beforeSerialize(obj, key) {
                    if (key === 'rechten') {
                        return obj;
                    }
                    return saveHuidigeWekenBereik(obj);
                },
                deserialize(obj) {
                    return JSON.parse(obj, datumReviver);
                }
            })
        ),
        animationPovider,
        provideHttpClient(withInterceptors([authInterceptorFn, errorInterceptorFn])),
        provideRouter(
            routes,
            withPreloading(PreloadAllModules),
            withInMemoryScrolling(),
            withComponentInputBinding(),
            withRouterConfig({ onSameUrlNavigation: 'reload' })
        ),
        provideOAuthClient(),
        quicklinkProviders,
        appViewContainerRefProvider('_viewContainerRef'),
        provideToastr({
            toastComponent: ToastComponent,
            preventDuplicates: true,
            resetTimeoutOnDuplicate: true,
            tapToDismiss: false
        }),
        {
            provide: APP_SPINNER,
            useValue: signal(false)
        }
    ]
};

bootstrapApplication(AppComponent, appConfig).catch(console.error);
