import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject, input, output } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SsoService } from 'leerling-authentication';

@Component({
    selector: 'sl-html-content',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="content" #contentRef [innerHTML]="innerHtml()"></div>`,
    styles: [
        `
            :host {
                white-space: break-spaces;
                word-wrap: break-word;

                .content::ng-deep {
                    p {
                        margin: 0;

                        &:not(::last-child) {
                            min-height: 1em;
                        }
                    }
                }
            }
        `
    ]
})
export class HtmlContentComponent implements OnDestroy {
    @ViewChild('contentRef', { static: true, read: ElementRef }) private _contentRef: ElementRef;

    public content = input.required<string>();

    // bewaar de witregels
    public innerHtml = computed(() => this.content().replace(/<p><\/p>/g, '<p>&nbsp;</p>'));

    private _linkClickListeners: any[] = [];
    private _ssoService = inject(SsoService);

    linkOpened = output<string>();

    constructor() {
        effect(() => {
            this.content() && setTimeout(() => this.addClickListeners());
        });
    }

    private addClickListeners() {
        this._linkClickListeners.forEach((listener) => removeEventListener('click', listener));
        this._linkClickListeners = Array.from(this._contentRef.nativeElement.querySelectorAll('a')).map((link: any) => {
            link.addEventListener('click', (event: any) => {
                this.linkOpened.emit(event.target.href);
                if (Capacitor.isNativePlatform()) {
                    event.preventDefault();
                    this._ssoService.openExternalLink(event.target.href);
                }
            });
        });
    }

    public ngOnDestroy() {
        this._linkClickListeners.forEach((listener) => removeEventListener('click', listener));
    }
}
