import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from 'harmony';
import { AppStatusService } from 'leerling-app-status';
import { AuthenticationService } from 'leerling-authentication';
import { environment } from 'leerling-environment';
import { SupportedErrorTypes } from 'leerling-error-models';
import { isAndroid } from 'leerling-util';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { ErrorImageComponent } from './error.image.component';

@Component({
    selector: 'sl-error',
    imports: [CommonModule, ErrorImageComponent, ButtonComponent],
    templateUrl: './error.component.html',
    styleUrls: ['./error.component.scss']
})
export class ErrorComponent {
    private router = inject(Router);
    private authenticationService = inject(AuthenticationService);
    private _appStatusService = inject(AppStatusService);

    private static numberOfClicks = 0;

    private _paramType = injectQueryParams('type');
    public errorType = computed(() => {
        switch (this._paramType()) {
            case SupportedErrorTypes.IDP_USERTYPE:
                return SupportedErrorTypes.IDP_USERTYPE;
            case SupportedErrorTypes.IDP_CONTEXT_UNAVAILABLE:
                return SupportedErrorTypes.IDP_CONTEXT_UNAVAILABLE;
            case SupportedErrorTypes.IDP_DOWN:
                return SupportedErrorTypes.IDP_DOWN;
            case SupportedErrorTypes.UNSUPPORTED_VERSION:
                return SupportedErrorTypes.UNSUPPORTED_VERSION;
            default:
                return SupportedErrorTypes.UNKNOWN_ERROR;
        }
    });
    public errorMessage = computed(() => this.typeToMessage(this.errorType()));
    public isUnsupported = computed(() => this.errorType() === SupportedErrorTypes.UNSUPPORTED_VERSION);
    public isIdpDown = computed(() => this.errorType() === SupportedErrorTypes.IDP_DOWN);
    public storeButtonLabel = isAndroid() ? 'Open Play Store' : 'Open App Store';

    private typeToMessage(errorType: SupportedErrorTypes): string {
        switch (errorType) {
            case SupportedErrorTypes.IDP_USERTYPE:
                return 'Op dit moment ondersteunen we geen medewerker accounts.';
            case SupportedErrorTypes.IDP_CONTEXT_UNAVAILABLE:
            case SupportedErrorTypes.IDP_DOWN:
                return 'Somtoday is op dit moment niet bereikbaar.';
            default:
                return 'Er is een onverwachte fout opgetreden.';
        }
    }

    goHome() {
        ErrorComponent.numberOfClicks++;
        if (ErrorComponent.numberOfClicks === 5) {
            // Er is al 5x geklikt, dat is wel erg vaak. Verwijder alle login-info en begin opnieuw.
            ErrorComponent.numberOfClicks = 0;
            this.authenticationService.purge();
            environment.clear();
        }
        this.router.navigateByUrl('/');
    }

    goToStore() {
        window.location.href = this._appStatusService.getStoreUrl();
    }
}
