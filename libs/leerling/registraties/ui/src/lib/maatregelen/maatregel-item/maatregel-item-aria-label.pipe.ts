import { Pipe, PipeTransform } from '@angular/core';
import { HmyDatePipe } from 'harmony';
import { SMaatregelToekenning } from 'leerling/store';

@Pipe({
    name: 'maatregelItemAriaLabel',
    standalone: true
})
export class MaatregelItemAriaLabelPipe implements PipeTransform {
    private datePipe = new HmyDatePipe();

    transform(value: SMaatregelToekenning): string {
        let label = `Maatregel: ${value.maatregel.omschrijving}, ${this.datePipe.transform(value.maatregelDatum, 'dag_uitgeschreven_dagnummer_maand')}`;
        if (value.opmerkingen) {
            label += `, Opmerking: ${value.opmerkingen}`;
        }
        return label;
    }
}
