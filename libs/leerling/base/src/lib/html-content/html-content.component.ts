import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { SsoService } from 'leerling-authentication';

const CAPACITOR_IN_APP_URL_REGEX = /^((http|https|capacitor):\/\/localhost)(:[0-9]{1,5})?(.+)$/;
const RELATIEVE_URL_GROUP = 4;

@Component({
    selector: 'sl-html-content',
    imports: [CommonModule],
    template: `<div class="content" #contentRef [innerHTML]="innerHtml()"></div>`,
    styleUrl: './html.content.component.scss'
})
export class HtmlContentComponent implements OnDestroy {
    @ViewChild('contentRef', { static: true, read: ElementRef }) private _contentRef: ElementRef;

    private _router = inject(Router);

    public content = input.required<string>();

    // bewaar de witregels
    public innerHtml = computed(() => this.content().replace(/<p><\/p>/g, '<p>&nbsp;</p>'));

    private _linkClickListeners: any[] = [];
    private _ssoService = inject(SsoService);

    linkOpened = output<string>();

    constructor() {
        effect(() => {
            if (this.content()) setTimeout(() => this.addClickListeners());
        });
    }

    private addClickListeners() {
        this._linkClickListeners.forEach((listener) => removeEventListener('click', listener));
        this._linkClickListeners = Array.from(this._contentRef.nativeElement.querySelectorAll('a')).map((link: any) => {
            link.addEventListener('click', (event: any) => {
                this.linkOpened.emit(event.target.href);
                if (Capacitor.isNativePlatform()) {
                    event.preventDefault();

                    const href = event.target.href as string;
                    const matches = href.match(CAPACITOR_IN_APP_URL_REGEX);
                    if (matches) {
                        this._router.navigateByUrl(matches[RELATIEVE_URL_GROUP]);
                    } else {
                        this._ssoService.openExternalLink(event.target.href);
                    }
                }
            });
        });
    }

    public ngOnDestroy() {
        this._linkClickListeners.forEach((listener) => removeEventListener('click', listener));
    }
}
