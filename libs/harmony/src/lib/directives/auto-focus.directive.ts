import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

@Directive({
    selector: '[hmyAutoFocus]',
    standalone: true
})
export class AutoFocusDirective implements AfterViewInit {
    // Het kan zijn dat je de autofocus via ts uit wil kunnen zetten (denk aan gedeelde componenten).
    // Deze input zorgt ervoor dat dat mogelijk is.
    // Zie bericht-ontvanger-selectie.component.html voor een voorbeeld.
    @Input() autoFocus = true;

    constructor(private el: ElementRef) {}

    ngAfterViewInit() {
        if (this.autoFocus) {
            // setTimeout for chrome
            setTimeout(() => {
                this.el.nativeElement.focus();
            }, 50);
        }
    }
}
