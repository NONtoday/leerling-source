import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'sl-dagview-img',
    standalone: true,
    template: `
        <svg width="48" height="80" viewBox="0 0 48 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="46" height="78" rx="5" fill="var(--bg-neutral-none)" />
            <rect x="1" y="1" width="46" height="78" rx="5" stroke="var(--border-neutral-strong)" stroke-width="2" />
            <path
                d="M7 24C7 22.3431 8.34315 21 10 21H29C30.6569 21 32 22.3431 32 24V26C32 27.6569 30.6569 29 29 29H10C8.34315 29 7 27.6569 7 26V24Z"
                fill="var(--bg-neutral-moderate)" />
            <path
                d="M7 34C7 32.3431 8.34315 31 10 31H29C30.6569 31 32 32.3431 32 34V36C32 37.6569 30.6569 39 29 39H10C8.34315 39 7 37.6569 7 36V34Z"
                fill="var(--bg-neutral-moderate)" />
            <path
                d="M7 44C7 42.3431 8.34315 41 10 41H29C30.6569 41 32 42.3431 32 44V46C32 47.6569 30.6569 49 29 49H10C8.34315 49 7 47.6569 7 46V44Z"
                fill="var(--bg-neutral-moderate)" />
            <path
                d="M7 54C7 52.3431 8.34315 51 10 51H29C30.6569 51 32 52.3431 32 54V56C32 57.6569 30.6569 59 29 59H10C8.34315 59 7 57.6569 7 56V54Z"
                fill="var(--bg-neutral-moderate)" />
            <path
                d="M7 64C7 62.3431 8.34315 61 10 61H29C30.6569 61 32 62.3431 32 64V66C32 67.6569 30.6569 69 29 69H10C8.34315 69 7 67.6569 7 66V64Z"
                fill="var(--bg-neutral-moderate)" />
            <path d="M36 24C36 22.3431 37.3431 21 39 21H46V29H39C37.3431 29 36 27.6569 36 26V24Z" fill="var(--bg-neutral-moderate)" />
            <path d="M36 34C36 32.3431 37.3431 31 39 31H46V39H39C37.3431 39 36 37.6569 36 36V34Z" fill="var(--bg-neutral-moderate)" />
            <path d="M36 44C36 42.3431 37.3431 41 39 41H46V49H39C37.3431 49 36 47.6569 36 46V44Z" fill="var(--bg-neutral-moderate)" />
            <path
                d="M13 11C13 12.6569 11.6569 14 10 14C8.34315 14 7 12.6569 7 11C7 9.34315 8.34315 8 10 8C11.6569 8 13 9.34315 13 11Z"
                fill="var(--border-neutral-strong)" />
            <path
                d="M20 11C20 12.6569 18.6569 14 17 14C15.3431 14 14 12.6569 14 11C14 9.34315 15.3431 8 17 8C18.6569 8 20 9.34315 20 11Z"
                fill="var(--bg-neutral-weak)" />
            <path
                d="M27 11C27 12.6569 25.6569 14 24 14C22.3431 14 21 12.6569 21 11C21 9.34315 22.3431 8 24 8C25.6569 8 27 9.34315 27 11Z"
                fill="var(--bg-neutral-weak)" />
            <path
                d="M34 11C34 12.6569 32.6569 14 31 14C29.3431 14 28 12.6569 28 11C28 9.34315 29.3431 8 31 8C32.6569 8 34 9.34315 34 11Z"
                fill="var(--bg-neutral-weak)" />
            <path
                d="M41 11C41 12.6569 39.6569 14 38 14C36.3431 14 35 12.6569 35 11C35 9.34315 36.3431 8 38 8C39.6569 8 41 9.34315 41 11Z"
                fill="var(--bg-neutral-weak)" />
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
export class DagViewImageComponent {}
