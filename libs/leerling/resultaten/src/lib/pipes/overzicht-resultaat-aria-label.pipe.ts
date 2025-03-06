import { Pipe, PipeTransform } from '@angular/core';
import { isPresent } from 'harmony';
import { SGeldendVoortgangsdossierResultaat } from 'leerling/store';
import { isEmpty } from 'lodash-es';

@Pipe({
    name: 'overzichtResultaatAriaLabel',
    standalone: true
})
export class OverzichtResultaatAriaLabelPipe implements PipeTransform {
    transform(resultaat: SGeldendVoortgangsdossierResultaat, isStandaardNiveau = true): string | undefined {
        let cijfer = isStandaardNiveau ? resultaat.formattedResultaat : resultaat.formattedResultaatAlternatief;

        if (resultaat.bijzonderheid === 'Vrijstelling') {
            cijfer = 'Vrijstelling';
        } else if (resultaat.bijzonderheid === 'NietGemaakt') {
            cijfer = 'Niet gemaakt';
        } else if (isEmpty(cijfer)) {
            cijfer = 'Geen cijfer';
        }

        return [cijfer, resultaat.omschrijving, `weging ${resultaat.weging} keer`].filter(isPresent).join(' • ');
    }
}
