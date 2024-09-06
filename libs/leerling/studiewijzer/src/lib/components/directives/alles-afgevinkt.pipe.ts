import { Pipe, PipeTransform } from '@angular/core';
import { SStudiewijzerItem } from 'leerling/store';

@Pipe({
    name: 'allesAfgevinkt',
    standalone: true
})
export class AllesAfgevinktPipe implements PipeTransform {
    transform(items: SStudiewijzerItem[]): boolean {
        return !items.find((item) => !item.gemaakt);
    }
}
