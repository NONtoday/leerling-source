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
import { SOMTODAY_API_CONFIG } from '@shared/utils/somtoday-api-token';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { ToastComponent, appViewContainerRefProvider } from 'harmony';
import { TOKEN_KON_NIET_VERVERST_WORDEN } from 'iridium-authorization-header';
import { APP_SPINNER } from 'leerling-authentication';
import { environment } from 'leerling-environment';
import { disableAnimations, isWeb } from 'leerling-util';
import {
    AbsentieState,
    AfspraakState,
    BerichtState,
    CallState,
    CijferoverzichtState,
    ExamendossierContextState,
    HuiswerkState,
    InfoMessageState,
    InleveropdrachtListState,
    InleveropdrachtState,
    LaatsteResultaatState,
    LandelijkeMededelingenState,
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
    nxgsStorageKeys
} from 'leerling/store';
import { quicklinkProviders } from 'ngx-quicklink';
import { provideToastr } from 'ngx-toastr';
import { LEERLING_VERSION } from 'version-generator';
import { routes } from './app/app-routes';
import { AppComponent } from './app/app.component';
import { authInterceptorFn, errorInterceptorFn } from './app/http-interceptors';

const BUGSNAG_SAMPLE_RATE = 0.1;

const shouldSendToBugsnagAccordingToSampleRate = Math.random() < BUGSNAG_SAMPLE_RATE;

Bugsnag.start({
    apiKey: '8ae1f97765d162512dea7dc8927276e3',
    appType: Capacitor.getPlatform(),
    appVersion: LEERLING_VERSION,
    releaseStage: isWeb() ? environment.config.toString() : 'native',
    enabledReleaseStages: ['nightly', 'acceptatie', 'test', 'inkijk', 'inkijk2', 'productie', 'native'],
    enabledBreadcrumbTypes: environment.production ? [] : ['error', 'navigation', 'request', 'user'],
    trackInlineScripts: false,

    collectUserIp: false,
    onError: (event) => {
        if (!shouldSendToBugsnagAccordingToSampleRate) {
            return false;
        }

        if (event.originalError instanceof HttpErrorResponse && (event.originalError.status === 401 || event.originalError.status === 0)) {
            return false;
        }

        const originalError: Error | undefined =
            event.originalError && event.originalError instanceof Error ? event.originalError : undefined;

        if (originalError) {
            if (originalError.name === 'ChunkLoadError') {
                return false;
            } else if (originalError.message === TOKEN_KON_NIET_VERVERST_WORDEN) {
                return false;
            } else if (originalError.message?.includes('0 Unknown Error')) {
                return false;
            }
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
                LandelijkeMededelingenState,
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
                AbsentieState,
                InleveropdrachtState,
                InleveropdrachtListState,
                CijferoverzichtState,
                ExamendossierContextState
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
            tapToDismiss: true
        }),
        {
            provide: APP_SPINNER,
            useValue: signal(false)
        },
        {
            provide: SOMTODAY_API_CONFIG,
            useFactory: () => ({
                apiUrl: environment.apiUrl
            })
        }
    ]
};

bootstrapApplication(AppComponent, appConfig).catch(console.error);
