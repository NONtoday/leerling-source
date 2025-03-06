import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SpinnerComponent } from 'harmony';
import { sha256 } from 'js-sha256';
import { environment } from 'leerling-environment';
import { v4 as uuidv4 } from 'uuid';

export const REDIRECT_KEY = 'sll-redirectUrl';

@Component({
    selector: 'sl-redirect',
    imports: [CommonModule, SpinnerComponent],
    templateUrl: './redirect.component.html',
    styleUrl: './redirect.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RedirectComponent implements OnInit {
    private _activatedRoute = inject(ActivatedRoute);

    public invalidState = signal(false);

    ngOnInit() {
        const url = this._activatedRoute.snapshot.queryParams['url'];
        const token = this._activatedRoute.snapshot.fragment;

        if (token && url) {
            this.saveUrl(url);
            this.redirectToAuthenticator(token);
        } else {
            this.redirectToSavedUrl();
        }
    }

    private saveUrl(url: string) {
        localStorage.setItem(REDIRECT_KEY, url);
    }

    private getSavedUrl(): string | null {
        return localStorage.getItem(REDIRECT_KEY);
    }

    private deleteSavedUrl() {
        localStorage.removeItem(REDIRECT_KEY);
    }

    private redirectToAuthenticator(token: string) {
        const baseUrl = environment.idpIssuer;
        const path = '/oauth2/authorize';
        const params = `?${this.createQueryParams(token)}`;
        this.setHref(`${baseUrl}${path}${params}`);
    }

    private createQueryParams(token: string) {
        const params = {
            response_type: 'code',
            prompt: 'select_account',
            client_id: 'somtoday-leerling-redirect-web',
            state: uuidv4().toString().replace(/-/g, ''),
            redirect_uri: `${window.location.origin}/redirect`,
            code_challenge: sha256(uuidv4().toString().replace(/-/g, '')),
            code_challenge_method: 'S256',
            native_app_session_token: token
        };
        return Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
    }

    private redirectToSavedUrl() {
        const redirectUrl = this.getSavedUrl();
        this.deleteSavedUrl();
        if (redirectUrl) this.setHref(redirectUrl);
        else this.invalidState.set(true);
    }

    private setHref(url: string) {
        window.location.replace(url);
    }
}
