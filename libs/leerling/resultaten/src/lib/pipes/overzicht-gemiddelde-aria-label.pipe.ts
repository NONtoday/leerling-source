import { Pipe, PipeTransform } from '@angular/core';
import { SGeldendVoortgangsdossierResultaat } from 'leerling/store';
import { isEmpty } from 'lodash-es';

@Pipe({
    name: 'overzichtGemiddeldeAriaLabel',
    standalone: true
})
export class OverzichtGemiddeldeAriaLabelPipe implements PipeTransform {
    transform(
        resultaat: SGeldendVoortgangsdossierResultaat | undefined,
        isStandaardNiveau: boolean,
        gemiddeldeType: string,
        periodenaam: string
    ): string {
        if (resultaat?.bijzonderheid === 'TeltNietMee') {
            return gemiddeldeType + ' telt niet mee in periode ' + periodenaam;
        }

        let cijfer = isStandaardNiveau ? resultaat?.formattedResultaat : resultaat?.formattedResultaatAlternatief;
        if (isEmpty(cijfer)) {
            cijfer = 'Geen cijfer';
        }

        if (resultaat?.bijzonderheid === 'NietGemaakt') {
            cijfer += ' en er zijn gemiste toetsen';
        }

        return cijfer + ' voor ' + gemiddeldeType + ' in periode ' + periodenaam;
    }
}
