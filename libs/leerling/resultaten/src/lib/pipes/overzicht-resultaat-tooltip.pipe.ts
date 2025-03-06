import { Pipe, PipeTransform } from '@angular/core';
import { isPresent } from 'harmony';
import { SGeldendVoortgangsdossierResultaat } from 'leerling/store';
import { isEmpty } from 'lodash-es';

@Pipe({
    name: 'overzichtResultaatTooltip',
    standalone: true
})
export class OverzichtResultaatTooltipPipe implements PipeTransform {
    transform(resultaat: SGeldendVoortgangsdossierResultaat, isStandaardNiveau = true): string | undefined {
        const isLeegResultaat = isStandaardNiveau
            ? isEmpty(resultaat.formattedResultaat)
            : isEmpty(resultaat.formattedResultaatAlternatief);

        let bijzonderheid = isLeegResultaat ? 'Geen cijfer' : undefined;

        if (resultaat.bijzonderheid === 'NietGemaakt') {
            bijzonderheid = 'Toets niet gemaakt';
        } else if (resultaat.bijzonderheid === 'Vrijstelling') {
            bijzonderheid = 'Vrijstelling';
        }

        return [bijzonderheid, resultaat.omschrijving, `weging ${resultaat.weging}x`].filter(isPresent).join(' • ');
    }
}
