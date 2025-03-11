import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import Bugsnag from '@bugsnag/js';
import { Capacitor } from '@capacitor/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { addHours, isBefore, subMinutes } from 'date-fns';
import { sha256 } from 'js-sha256';
import { environment } from 'leerling-environment';
import { AppCheckToken } from 'leerling-plugins';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';
import { APP_SPINNER } from '../app-spinner';
import { AuthenticationService } from './authentication.service';

export const LAST_AUTH_MOMENT = 'sll-last-sso-auth-moment';

@Injectable({
    providedIn: 'root'
})
export class SsoService {
    private _httpClient = inject(HttpClient);
    private _oauthService = inject(OAuthService);
    private _authenticationService = inject(AuthenticationService);

    private appSpinner = inject(APP_SPINNER);

    public openExternalLink(url: string) {
        if (this._authenticationService.isCurrentContextOuderVerzorger || !Capacitor.isNativePlatform() || this.isStillAuthenticated()) {
            window.open(url, '_blank');
            return;
        }
        this.appSpinner.set(true);
        this.getSSOToken()
            .pipe(
                catchError((error) => {
                    this.appSpinner.set(false);
                    Bugsnag.notify(error);
                    this.setHref(url);
                    return of();
                })
            )
            .subscribe((token) => {
                this.saveAuthenticationMoment();
                const sessionCreationUrl = `${environment.leerlingBaseUriForCurrentIridiumConfig}/redirect?url=${encodeURIComponent(url)}#${encodeURIComponent(token)}`;
                this.appSpinner.set(false);
                this.setHref(sessionCreationUrl);
            });
    }

    private getSSOToken(): Observable<string> {
        const hash = sha256(this._oauthService.getAccessToken());
        if (Capacitor.getPlatform() === 'android') {
            return from(AppCheckToken.getToken({ input: hash })).pipe(
                switchMap((result) => {
                    return this._httpClient.get<{ sessionToken: string }>(
                        environment.apiUrl + `/validate/googleplay?token=${encodeURIComponent(String(result.android))}`
                    );
                }),
                map((response) => response.sessionToken)
            );
        } else {
            return from(AppCheckToken.getToken({ input: hash })).pipe(
                switchMap((token) =>
                    this._httpClient.get<{ sessionToken: string }>(
                        environment.apiUrl +
                            `/validate/appledevicecheck?token=${encodeURIComponent(String(token.iOS?.attestation))}&keyId=${encodeURIComponent(String(token.iOS?.keyId))}`
                    )
                ),
                map((response) => response.sessionToken)
            );
        }
    }

    private isStillAuthenticated(): boolean {
        const lastAuthMoment = localStorage.getItem(LAST_AUTH_MOMENT);
        if (!lastAuthMoment) return false;

        const lastAuthMomentDate = new Date(JSON.parse(lastAuthMoment));
        return isBefore(new Date(), subMinutes(addHours(lastAuthMomentDate, 8), 1));
    }

    public saveAuthenticationMoment() {
        localStorage.setItem(LAST_AUTH_MOMENT, JSON.stringify(Date.now()));
    }

    private setHref(url: string) {
        window.location.href = url;
    }
}
