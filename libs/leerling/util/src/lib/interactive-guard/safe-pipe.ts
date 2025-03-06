import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
    name: 'safe',
    standalone: true
})
export class SafePipe implements PipeTransform {
    private _sanitizer = inject(DomSanitizer);

    transform(url: string) {
        return this._sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}
