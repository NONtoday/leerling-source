import { Pipe, PipeTransform } from '@angular/core';
import { isBefore } from 'date-fns';
import { formatDateNL } from 'leerling-util';
import { SAfspraakActie } from 'leerling/store';

@Pipe({
    name: 'toInschrijfdatum',
    standalone: true
})
export class toInschrijfdatumPipe implements PipeTransform {
    transform(afspraakActie: SAfspraakActie): string {
        if (!afspraakActie.inschrijfBeginDatum || !afspraakActie.inschrijfEindDatum) return '';

        if (isBefore(new Date(), afspraakActie.inschrijfBeginDatum)) {
            return `Inschrijven vanaf ${formatDateNL(afspraakActie.inschrijfBeginDatum, 'dagnummer_maand_lang_tijd_lowercase')}`;
        }

        return `Inschrijven voor ${formatDateNL(afspraakActie.inschrijfEindDatum, 'dagnummer_maand_lang_tijd_lowercase')}`;
    }
}
