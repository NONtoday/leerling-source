import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IsActiveMatchOptions, Router } from '@angular/router';
import Bugsnag from '@bugsnag/js';
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';
import { Store } from '@ngxs/store';
import { isToday } from 'date-fns';
import { isPresent } from 'harmony';
import { ERROR, SupportedErrorTypes } from 'leerling-error-models';
import { AppVersion } from 'leerling-plugins';
import { RequestService } from 'leerling-request';
import { InfoMessageService, isAndroid, isWeb } from 'leerling-util';
import { SharedSelectors } from 'leerling/store';
import { BehaviorSubject, EMPTY, Observable, catchError, distinctUntilChanged, filter, map, take } from 'rxjs';

``;
export interface Versioning {
    version: string;
}

export interface Version {
    major: number;
    minor: number;
    patch: number;
}

export interface LastChecked {
    checkedVersion: string;
    checkedTime: number;
    isSupported: boolean;
}

export const LAST_SUPPORTED_VERSION_CHECKED = 'lastSupportedVersionChecked';

const ROUTE_MATCH_OPTIONS: IsActiveMatchOptions = {
    paths: 'subset',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored'
};

@Injectable({
    providedIn: 'root'
})
export class AppStatusService {
    private _httpClient = inject(HttpClient);
    private readonly store = inject(Store);
    private _router = inject(Router);
    private _requestService = inject(RequestService);
    private _infoMessageService = inject(InfoMessageService);

    private _versionSubject = new BehaviorSubject<string | undefined>(undefined);

    constructor() {
        this._httpClient
            .get<Versioning>('/assets/version.json')
            .pipe(
                map((version: Versioning) => version.version),
                take(1)
            )
            .subscribe((value) => this._versionSubject.next(value));
    }

    public getVersion$(): Observable<string> {
        return this._versionSubject.pipe(filter(isPresent));
    }

    isOnline() {
        return this.store.select(SharedSelectors.getConnectionStatus()).pipe(
            map((status) => status.isOnline),
            distinctUntilChanged()
        );
    }

    isOnlineSignal() {
        return toSignal(this.isOnline(), { initialValue: true });
    }

    getConnectionStatus() {
        return this.store.select(SharedSelectors.getConnectionStatus());
    }

    public async guardVersionSupported() {
        if (isWeb()) return;

        const lastChecked = this.getLastChecked();
        const currentAppVersion = (await AppVersion.getAppVersion()).version;

        // Check of de versie al gecheckt is vandaag
        if (lastChecked && isToday(lastChecked.checkedTime) && lastChecked.checkedVersion === currentAppVersion) {
            // Als de versie niet supported is, redirect naar unsupported pagina
            this.checkForUpdateOrRedirect(lastChecked.isSupported);
        } else {
            this.refreshLastChecked();
        }
    }

    private checkForUpdateOrRedirect(isSupported: boolean) {
        if (isSupported) {
            this.checkForUpdate();
        } else {
            this.redirectUnsupported();
        }
    }

    private checkForUpdate() {
        AppUpdate.getAppUpdateInfo()
            .then((updateInfo) => {
                if (updateInfo.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
                    this._infoMessageService.dispatchInfoMessage(
                        `Er is een nieuwe versie van de app beschikbaar. Klik <a href="${this.getStoreUrl()}">hier</a> om te updaten.`
                    );
                }
            })
            .catch((err) => {
                Bugsnag.notify(err);
            });
    }

    private async refreshLastChecked() {
        const appVersion = this.mapVersion((await AppVersion.getAppVersion()).version);
        this._requestService
            .get('/appinfo/leerling/supported', {
                headers: {
                    Accept: 'text/plain'
                },
                responseType: 'text',
                ignoreStatusCodes: [401, 404]
            })
            .pipe(
                map(this.mapVersion),
                take(1),
                catchError(() => {
                    this.checkForUpdate();
                    return EMPTY;
                })
            )
            .subscribe((supportedVersion) => {
                const isSupported = this.isVersionSupported(appVersion, supportedVersion);
                localStorage.setItem(
                    LAST_SUPPORTED_VERSION_CHECKED,
                    JSON.stringify({
                        checkedVersion: appVersion,
                        checkedTime: new Date().getTime(),
                        isSupported
                    })
                );
                this.checkForUpdateOrRedirect(isSupported);
            });
    }

    private redirectUnsupported() {
        if (this._router.isActive(ERROR, ROUTE_MATCH_OPTIONS)) return;
        this._router.navigate([`/${ERROR}`], {
            queryParams: {
                type: SupportedErrorTypes.UNSUPPORTED_VERSION
            },
            queryParamsHandling: 'merge'
        });
    }

    private mapVersion(version: string): Version {
        const [major, minor, patch] = version.split('.').map((v) => parseInt(v, 10));
        return { major, minor, patch };
    }

    private getLastChecked(): LastChecked | undefined {
        const lastCheck = localStorage.getItem(LAST_SUPPORTED_VERSION_CHECKED);
        return lastCheck ? JSON.parse(lastCheck) : undefined;
    }

    private isVersionSupported(appVersion: Version, minimalSupportedVersion: Version): boolean {
        if (appVersion.major !== minimalSupportedVersion.major) {
            return appVersion.major > minimalSupportedVersion.major;
        }
        if (appVersion.minor !== minimalSupportedVersion.minor) {
            return appVersion.minor > minimalSupportedVersion.minor;
        }
        return appVersion.patch >= minimalSupportedVersion.patch;
    }

    public getStoreUrl() {
        return isAndroid()
            ? 'https://play.google.com/store/apps/details?id=nl.topicus.somtoday.leerling'
            : 'https://apps.apple.com/nl/app/somtoday-leerling/id1166205927';
    }
}
