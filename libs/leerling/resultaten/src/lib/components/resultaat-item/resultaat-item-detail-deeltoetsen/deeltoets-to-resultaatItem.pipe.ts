import { Pipe, PipeTransform } from '@angular/core';
import { SGeldendResultaat, SGeldendVoortgangsdossierResultaat } from 'leerling/store';
import { formatCijferDate } from '../../../services/laatsteresultaten/laatsteresultaten-model';
import { ResultaatItem, formatIsVoldoende } from '../resultaat-item-model';

@Pipe({ name: 'deeltoetsToResultaatItem', standalone: true })
export class DeeltoetsToResultaatItemPipe implements PipeTransform {
    transform(value: SGeldendResultaat, isAlternatieveNormering: boolean): ResultaatItem {
        const geldend: SGeldendVoortgangsdossierResultaat = value as SGeldendVoortgangsdossierResultaat;
        return {
            titel: value.omschrijving,
            heeftOpmerking: false,
            subtitel: formatCijferDate(value.datumInvoerEerstePoging),
            weging: `${value.weging}x`,
            toetstype: value.type,
            resultaat: (isAlternatieveNormering ? geldend.formattedResultaatAlternatief : value.formattedResultaat) ?? '-',
            isLeegResultaat: (isAlternatieveNormering ? geldend.formattedResultaatAlternatief : value.formattedResultaat) === undefined,
            isHerkansing: false,
            isVoldoende: formatIsVoldoende(value.weging, true, isAlternatieveNormering ? geldend.isVoldoendeAlternatief : value.isVoldoende)
        };
    }
}
