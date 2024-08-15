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
                map((rechten) => {
                    if (rechten.roosterBekijkenAan) return 'rooster';
                    if (rechten.huiswerkBekijkenAan) return 'studiewijzer';
                    return 'vandaag';
                }),
                catchError(() => {
                    // hier in de toekomst nog auth-state checken en evt offline mode supporten door naar andere route te redirecten?
                    return of('geen-plaatsing');
                }),
                takeUntilDestroyed()
            )
            .subscribe((path: string) => {
                this._router.navigate([path]);
            });
    }
}
