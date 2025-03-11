import { ElementRef, Pipe, PipeTransform, inject } from '@angular/core';

/**
 * Pipe die de data teruggeeft op basis van de positie van het element.
 *
 * VEREIST: data-position moet al geset zijn op het element in het template met de waarde 'left', 'center' of 'right'.
 *
 * Voorbeeld:
 *      <sl-element data-position="left" />
 *      <sl-element data-position="center" />
 *      <sl-element data-position="right" />
 */
@Pipe({
    name: 'drieluikData',
    standalone: true
})
export class DrieluikDataPipe implements PipeTransform {
    private _elementRef = inject(ElementRef);

    transform<T>(data: T[], index: number): T {
        const position = this._elementRef.nativeElement.dataset.position;

        switch (position) {
            case 'left':
                return data[0];
            case 'center':
                return data[1];
            case 'right':
                return data[2];
            default:
                return data[index];
        }
    }
}
