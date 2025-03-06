import { Pipe, PipeTransform } from '@angular/core';
import { LaatsteResultaat } from '../../../services/laatsteresultaten/laatsteresultaten-model';
import { ResultaatItem, TeltNietMeeType, getHerkansingssoortOmschrijving } from '../../resultaat-item/resultaat-item-model';

@Pipe({ name: 'toResultaatItem', standalone: true })
export class ToResultaatItemPipe implements PipeTransform {
    transform(resultaat: LaatsteResultaat): ResultaatItem {
        let teltNietMee: TeltNietMeeType | undefined = undefined;
        if (!resultaat.teltPogingMee) {
            teltNietMee = resultaat.herkansing > 0 ? 'Deze herkansing telt niet mee' : 'Deze poging telt niet mee';
        }

        return {
            ...resultaat,
            titel: resultaat.vakNaam,
            titelPostfix: resultaat.isAlternatief ? resultaat.naamAlternatiefNiveau : undefined,
            subtitel: `${resultaat.formattedDate} • ${resultaat.omschrijving}`,
            toetstype: resultaat.geldendResultaten[0].type,
            teltNietMee: teltNietMee,
            weging: resultaat.geldendResultaten[0].weging + 'x',
            details: {
                ...resultaat,
                herkansingSoortOmschrijving: getHerkansingssoortOmschrijving(resultaat.herkansingssoort, resultaat.herkansing),
                resultaatkolomId: resultaat.resultaatkolom,
                dossierType: resultaat.geldendResultaten[0].dossierType,
                heeftHerkansing: resultaat.herkansingssoort !== 'Geen',
                geldend: resultaat.geldendePoging
                    ? {
                          poging: resultaat.geldendePoging.poging,
                          resultaat: resultaat.geldendePoging.resultaat,
                          isOnvoldoende: resultaat.geldendePoging.isOnvoldoende,
                          herkansingssoort: resultaat.herkansingssoort
                      }
                    : undefined,
                isAlternatief: resultaat.isAlternatief
            },
            pogingTooltipOmschrijving: resultaat.isHerkansing ? 'Cijfer is een herkansing' : 'Cijfer is eerste poging'
        };
    }
}
