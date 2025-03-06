import { Pipe, PipeTransform } from '@angular/core';
import { SVakPeriode } from 'leerling/store';

@Pipe({
    name: 'findVakPeriode',
    standalone: true
})
export class FindVakPeriodePipe implements PipeTransform {
    transform(elements: SVakPeriode[], periode: number): SVakPeriode | undefined {
        return elements.find((element) => element.periode === periode);
    }
}
