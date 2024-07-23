import { Pipe, PipeTransform } from '@angular/core';
import { format } from 'date-fns';
import { SAfspraakActie } from 'leerling/store';

@Pipe({
    name: 'toLestijd',
    standalone: true
})
export class toLestijdPipe implements PipeTransform {
    transform(afspraakActie: SAfspraakActie, ariaLabel: boolean): string {
        if (ariaLabel) {
            return `begint op ${format(afspraakActie.beginDatumTijd, 'HH:mm')} tot ${format(afspraakActie.eindDatumTijd, 'HH:mm')},`;
        }
        return `${format(afspraakActie.beginDatumTijd, 'HH:mm')} - ${format(afspraakActie.eindDatumTijd, 'HH:mm')}`;
    }
}
