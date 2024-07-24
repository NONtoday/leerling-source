import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SpinnerComponent } from 'harmony';
import { RechtenService } from 'leerling/store';
import { catchError, map, of, timeout } from 'rxjs';

@Component({
    selector: 'sl-root-redirect',
    standalone: true,
    imports: [SpinnerComponent],
    template: `<hmy-spinner></hmy-spinner>`,
    styles: `
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
            hmy-spinner {
                margin-top: 32px;
            }
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
                map((rechten) => {
                    if (rechten.roosterBekijkenAan) return 'rooster';
                    if (rechten.huiswerkBekijkenAan) return 'studiewijzer';
                    return 'vandaag';
                }),
                catchError(() => {
                    // hier in de toekomst nog auth-state checken en evt offline mode supporten door naar andere route te redirecten?
                    return of('error');
                }),
                takeUntilDestroyed()
            )
            .subscribe((path: string) => {
                this._router.navigate([path]);
            });
    }
}
