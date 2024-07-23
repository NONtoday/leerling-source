import { Pipe, PipeTransform } from '@angular/core';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Vakantie } from 'leerling/store';

@Pipe({
    name: 'vakantieSubtitle',
    standalone: true
})
export class VakantieSubtitlePipe implements PipeTransform {
    transform(vakantie: Vakantie): string {
        if (vakantie.intervalInRange.start.valueOf() === vakantie.intervalInRange.end.valueOf())
            return this.dateToString(vakantie.intervalInRange.start);
        return this.dateToString(vakantie.intervalInRange.start) + ' - ' + this.dateToString(vakantie.intervalInRange.end);
    }

    dateToString(date: Date | number | string) {
        return format(date, 'd MMM yyyy', { locale: nl }).replace('.', '');
    }
}
