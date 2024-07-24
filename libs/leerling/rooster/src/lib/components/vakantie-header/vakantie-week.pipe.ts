import { Pipe, PipeTransform } from '@angular/core';
import { addDays, startOfWeek } from 'date-fns';

@Pipe({
    name: 'weekBegindatum',
    standalone: true
})
export class VakantieWeekBegindatumPipe implements PipeTransform {
    transform(peildatum: Date): Date {
        return weekStart(peildatum);
    }
}

@Pipe({
    name: 'weekEinddatum',
    standalone: true
})
export class VakantieWeekeinddatumPipe implements PipeTransform {
    transform(peildatum: Date, toonWeekend: boolean): Date {
        const startDatum = weekStart(peildatum);

        if (toonWeekend) {
            return addDays(startDatum, 6);
        } else {
            return addDays(startDatum, 4);
        }
    }
}

function weekStart(peildatum: Date): Date {
    return startOfWeek(peildatum, { weekStartsOn: 1 });
}
