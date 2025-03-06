import { Pipe, PipeTransform } from '@angular/core';
import { VoortgangsPeriode } from '../../../services/vakresultaten/vakresultaten-model';

@Pipe({
    name: 'rapportCijferAriaLabelPipe',
    standalone: true
})
export class RapportCijferAriaLabelPipe implements PipeTransform {
    transform(periode: VoortgangsPeriode): string {
        const opmerking = periode.rapportCijferOpmerking ? `, ${periode.rapportCijferOpmerking}` : '';

        const rapportCijfer = periode.isLeegRapportCijfer ? 'Geen rapportcijfer' : periode.rapportCijfer;
        return 'Rapportcijfer: ' + rapportCijfer + opmerking;
    }
}
