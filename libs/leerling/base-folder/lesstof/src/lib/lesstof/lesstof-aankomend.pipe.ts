import { Pipe, PipeTransform } from '@angular/core';
import { endOfDay, endOfToday } from 'date-fns';
import { SStudiewijzerItem } from 'leerling/store';

@Pipe({
    name: 'lesstofAankomend',
    standalone: true
})
export class LesstofAankomendPipe implements PipeTransform {
    transform(item: SStudiewijzerItem): boolean {
        return endOfDay(item.datumTijd).getTime() > endOfToday().getTime();
    }
}
