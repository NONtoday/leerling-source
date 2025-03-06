import { Pipe, PipeTransform } from '@angular/core';
import { isPresent } from 'harmony';
import { SGeldendResultaat } from 'leerling/store';
import { isEmpty } from 'lodash-es';

@Pipe({
    name: 'examenGemiddeldeTooltip',
    standalone: true
})
export class ExamenGemiddeldeTooltipPipe implements PipeTransform {
    transform(resultaat: SGeldendResultaat): string | undefined {
        const isLeegResultaat = isEmpty(resultaat.formattedResultaat);

        let bijzonderheid = isLeegResultaat ? 'Geen cijfer' : undefined;

        if (resultaat.bijzonderheid === 'NietGemaakt') {
            bijzonderheid = 'Niet gemaakt';
        } else if (resultaat.bijzonderheid === 'Vrijstelling') {
            bijzonderheid = 'Vrijstelling';
        }
        const gemiddeldeLabel = resultaat.type === 'ToetssoortGemiddeldeKolom' ? resultaat.toetssoort : 'Schoolexamen';

        return [bijzonderheid, gemiddeldeLabel].filter(isPresent).join(', ');
    }
}
