import { Pipe, PipeTransform } from '@angular/core';
import { getMonth, getWeek, nextFriday } from 'date-fns';
import { formatDateNL } from 'harmony';
import { SStudiewijzerItem, formatNL } from 'leerling/store';

@Pipe({
    name: 'lesstofDatumformat',
    standalone: true
})
export class LesstofDatumformatPipe implements PipeTransform {
    transform(item: SStudiewijzerItem): string {
        if (item.swiToekenningType === 'WEEK') {
            const beginDatum = item.datumTijd;
            const eindDatum = nextFriday(item.datumTijd);
            // Indien we rond de maand wissel zitten, dan bevat de begindatum ook de naam van de maand.
            const formattedBeginDatum =
                getMonth(beginDatum) != getMonth(eindDatum) ? formatNL(beginDatum, 'd MMMM') : formatNL(beginDatum, 'd');

            return `Week ${getWeek(beginDatum)} • ${formattedBeginDatum} t/m ${formatNL(eindDatum, 'd MMMM')}`;
        } else {
            return formatDateNL(item.datumTijd, 'dag_uitgeschreven_dagnummer_maand');
        }
    }
}
