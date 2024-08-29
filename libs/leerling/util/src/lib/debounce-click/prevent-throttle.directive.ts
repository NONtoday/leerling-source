import { Directive, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
    selector: '[slPreventThrottle]',
    standalone: true
})
export class PreventThrottleDirective {
    @Input() throttleTimeout = 500;
    @Output() throttleClick = new EventEmitter();

    private clicks = new EventEmitter();
    private _lastClicked = signal(0);

    constructor() {
        this.clicks.pipe(takeUntilDestroyed()).subscribe(() => this.throttleClick.emit());
    }

    @HostListener('click', ['$event'])
    clickEvent(event: Event) {
        event.preventDefault();
        event.stopPropagation();

        const now = new Date().getTime();
        if (now - this._lastClicked() < this.throttleTimeout) return;
        this._lastClicked.set(now);

        this.clicks.emit(event);
    }
}
