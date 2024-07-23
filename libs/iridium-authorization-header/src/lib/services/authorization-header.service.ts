import { Injectable, inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Observable, Subject, catchError, delay, from, map, of, take, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthorizationHeaderService {
    private oauthService = inject(OAuthService);

    private isRefreshing = false;
    private authHeaderSubject = new Subject<string>();
    private refreshErrorSubject = new Subject<void>();

    /**
     * @param accessTokenValidity default value op 3_600_000 (één uur)
     */
    public getValidAuthorizationHeader(accessTokenValidity = 3_600_000): Observable<string> {
        if (this.isRefreshing) {
            return this.authHeaderSubject.pipe(take(1));
        }

        const expiresAt = this.oauthService.getAccessTokenExpiration();
        const clockSkewInMs = (this.oauthService.clockSkewInSec ?? 0) * 1000;
        const margin = accessTokenValidity * 0.1;
        const isAccessTokenValid = expiresAt - clockSkewInMs - margin > Date.now();
        if (isAccessTokenValid) {
            return of(this.oauthService.authorizationHeader());
        }

        this.isRefreshing = true;
        return this.refreshToken(true);
    }

    public isRefreshable(): boolean {
        return !!this.oauthService.getRefreshToken();
    }

    private refreshToken(withRetry: boolean): Observable<string> {
        return from(this.oauthService.refreshToken()).pipe(
            delay(withRetry ? 0 : 100),
            catchError((response) => {
                if (withRetry) {
                    return from(this.oauthService.refreshToken()).pipe(
                        catchError((response) => {
                            return this.handleError(response);
                        })
                    );
                }
                return this.handleError(response);
            }),
            take(1),
            map(() => this.oauthService.authorizationHeader()),
            tap((authorizationHeader) => {
                this.isRefreshing = false;
                this.authHeaderSubject.next(authorizationHeader);
            })
        );
    }

    private handleError(response: any): Observable<string> {
        this.isRefreshing = false;
        if (this.oauthService.hasValidAccessToken()) {
            const authHeader = this.oauthService.authorizationHeader();
            this.authHeaderSubject.next(authHeader);
            return of(authHeader);
        } else {
            if (response.status !== 0 && response.status < 500) {
                this.authHeaderSubject.error('Token kon niet ververst worden!');
                this.refreshErrorSubject.next();
            }
            throw new Error('Token kon niet ververst worden!');
        }
    }

    public get refreshError$(): Observable<void> {
        return this.refreshErrorSubject.asObservable();
    }
}
