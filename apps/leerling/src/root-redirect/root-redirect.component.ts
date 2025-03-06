import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SpinnerComponent } from 'harmony';
import { GEEN_PLAATSING, getRestriction, getRestrictionFromPath, ROOSTER, STUDIEWIJZER, VANDAAG } from 'leerling-base';
import { REloRestricties } from 'leerling-codegen';
import { getRequestedUrl, removeAuthRequestedUrl } from 'leerling-util';
import { RechtenService } from 'leerling/store';
import { catchError, map, of, timeout } from 'rxjs';

export function getRootPath(rechten: REloRestricties): string {
    if (rechten[getRestriction(ROOSTER)]) return ROOSTER;
    if (rechten[getRestriction(STUDIEWIJZER)]) return STUDIEWIJZER;
    return VANDAAG;
}

@Component({
    selector: 'sl-root-redirect',
    imports: [SpinnerComponent],
    template: `<hmy-spinner></hmy-spinner>
        <h2>Momentje, we checken wat gegevens.</h2>`,
    styles: `
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            place-content: center;
            gap: 16px;
            min-height: calc(var(--min-content-vh) - var(--safe-area-inset-top) - var(--safe-area-inset-bottom));
        }

        h2 {
            text-align: center;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RootRedirectComponent {
    private _router = inject(Router);
    private _rechtenService = inject(RechtenService);

    constructor() {
        this._rechtenService
            .getCurrentAccountRechten()
            .pipe(
                timeout(10000),
                map((rechten) => getRootPath(rechten)),
                // hier in de toekomst nog auth-state checken en evt offline mode supporten door naar andere route te redirecten?
                catchError(() => of(GEEN_PLAATSING)),
                takeUntilDestroyed()
            )
            .subscribe((userRootPath: string) => {
                const savedPath = getRequestedUrl();
                if (savedPath) {
                    const restriction = getRestrictionFromPath(savedPath);
                    if (restriction === undefined || this._rechtenService.heeftRechtSnapshot(restriction)) {
                        this._router.navigateByUrl(savedPath);
                        removeAuthRequestedUrl();
                        return;
                    }
                }

                this._router.navigateByUrl(userRootPath);
            });
    }
}
