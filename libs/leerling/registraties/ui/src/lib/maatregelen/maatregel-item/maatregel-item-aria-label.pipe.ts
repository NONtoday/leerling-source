import { Pipe, PipeTransform } from '@angular/core';
import { SlDatePipe } from 'leerling-util';
import { SMaatregelToekenning } from 'leerling/store';

@Pipe({
    name: 'maatregelItemAriaLabel',
    standalone: true
})
export class MaatregelItemAriaLabelPipe implements PipeTransform {
    private datePipe = new SlDatePipe();

    transform(value: SMaatregelToekenning): string {
        let label = `Maatregel: ${value.maatregel.omschrijving}, ${this.datePipe.transform(value.maatregelDatum, 'dag_uitgeschreven_dagnummer_maand')}`;
        if (value.opmerkingen) {
            label += `, Opmerking: ${value.opmerkingen}`;
        }
        return label;
    }
}
