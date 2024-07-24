import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'rapportCijferAriaLabelPipe',
    standalone: true
})
export class RapportCijferAriaLabelPipe implements PipeTransform {
    transform(periode: any): string {
        const opmerking = periode.rapportCijferOpmerking ? `, ${periode.rapportCijferOpmerking}` : '';

        return 'Rapportcijfer: ' + periode.rapportCijfer + opmerking;
    }
}
