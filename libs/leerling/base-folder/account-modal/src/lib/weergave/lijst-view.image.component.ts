import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'sl-lijstview-img',
    standalone: true,
    template: `
        <svg width="48" height="80" viewBox="0 0 48 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="46" height="78" rx="5" fill="var(--bg-neutral-none)" />
            <rect x="1" y="1" width="46" height="78" rx="5" stroke="var(--border-neutral-strong)" stroke-width="2" />
            <rect x="8" y="8" width="18" height="4" rx="2" fill="var(--border-neutral-strong)" />
            <rect x="8" y="14" width="32" height="8" rx="3" fill="var(--bg-neutral-moderate)" />
            <rect x="8" y="24" width="32" height="8" rx="3" fill="var(--bg-neutral-moderate)" />
            <rect x="8" y="38" width="18" height="4" rx="2" fill="var(--border-neutral-strong)" />
            <rect x="8" y="44" width="32" height="8" rx="3" fill="var(--bg-neutral-moderate)" />
            <rect x="8" y="54" width="32" height="8" rx="3" fill="var(--bg-neutral-moderate)" />
            <rect x="8" y="64" width="32" height="8" rx="3" fill="var(--bg-neutral-moderate)" />
        </svg>
        <span class="text"><ng-content></ng-content></span>
    `,
    styles: `
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .text {
            text-align: center;
            font: var(--body-content-semi);
            color: var(--text-weakest);
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LijstViewImageComponent {}
