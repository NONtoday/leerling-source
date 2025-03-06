import { Pipe, PipeTransform } from '@angular/core';
import { SStudiewijzerItem } from 'leerling/store';

@Pipe({
    name: 'aantalAfgevinkt',
    standalone: true
})
export class AantalAfgevinktPipe implements PipeTransform {
    transform(items: SStudiewijzerItem[]): string {
        const aantalAfgevinkt = items.filter((item) => item.gemaakt).length;
        return `${aantalAfgevinkt}/${items.length}`;
    }
}

@Pipe({
    name: 'aantalAfgevinktAria',
    standalone: true
})
export class AantalAfgevinktAriaPipe implements PipeTransform {
    transform(items: SStudiewijzerItem[] | undefined): string {
        if (!items) return '';

        const aantalAfgevinkt = items.filter((item) => item.gemaakt).length;
        return items.length === 0 ? '' : ` ${aantalAfgevinkt} van ${items.length} items afgevinkt`;
    }
}
