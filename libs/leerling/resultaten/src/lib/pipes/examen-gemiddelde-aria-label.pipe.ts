import { Pipe, PipeTransform } from '@angular/core';
import { SGeldendResultaat } from 'leerling/store';
import { isEmpty } from 'lodash-es';

@Pipe({
    name: 'examenGemiddeldeAriaLabel',
    standalone: true
})
export class ExamenGemiddeldeAriaLabelPipe implements PipeTransform {
    transform(resultaat: SGeldendResultaat): string | undefined {
        let cijfer = resultaat.formattedResultaat;

        if (resultaat.bijzonderheid === 'Vrijstelling') {
            cijfer = 'Vrijstelling';
        } else if (resultaat.bijzonderheid === 'NietGemaakt') {
            cijfer = 'Niet gemaakt';
        } else if (isEmpty(cijfer)) {
            cijfer = 'Geen cijfer';
        }

        const gemiddeldeLabel = resultaat.type === 'ToetssoortGemiddeldeKolom' ? resultaat.toetssoort : 'Schoolexamen';

        if (resultaat.bijzonderheid) {
            return gemiddeldeLabel + ', ' + cijfer;
        }

        return cijfer + ' als gemiddelde voor ' + gemiddeldeLabel;
    }
}
