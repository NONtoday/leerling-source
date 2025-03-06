import { Pipe, PipeTransform } from '@angular/core';
import { SGeldendResultaat } from 'leerling/store';
import { ToetsResultaat } from '../../services/vakresultaten/vakresultaten-model';
import {
    ResultaatItem,
    TeltNietMeeType,
    getHerkansingssoortOmschrijving,
    getPogingTooltipOmschrijving
} from '../resultaat-item/resultaat-item-model';

@Pipe({ name: 'toResultaatItem', standalone: true })
export class ToResultaatItemPipe implements PipeTransform {
    transform<T extends SGeldendResultaat>(resultaat: ToetsResultaat<T>, isAlternatiefNiveau: boolean): ResultaatItem {
        const teltNietMee: TeltNietMeeType | undefined =
            resultaat.geldendResultaat.weging === 0 && resultaat.resultaat ? 'Dit cijfer telt niet mee' : undefined;

        return {
            resultaat: resultaat.resultaat,
            isLeegResultaat: resultaat.isLeegResultaat,
            heeftOpmerking: resultaat.heeftOpmerking,
            isVoldoende: resultaat.isVoldoende,
            titel: resultaat.naam,
            subtitel: resultaat.datum,
            toetstype: resultaat.geldendResultaat.type,
            teltNietMee: teltNietMee,
            isHerkansing: resultaat.heeftHerkansing,
            weging: resultaat.geldendResultaat.dossierType === 'Voortgang' ? resultaat.wegingVoortgang : resultaat.wegingExamen,
            details: {
                herkansingSoortOmschrijving: getHerkansingssoortOmschrijving(
                    resultaat.geldendResultaat.herkansingssoort,
                    resultaat.laatstePoging
                ),
                toetssoort: resultaat.geldendResultaat.toetssoort,
                opmerking: resultaat.geldendResultaat.opmerkingen,
                weging: resultaat.wegingVoortgang ? resultaat.wegingVoortgang : (resultaat.wegingExamen ?? ''),
                afwijkendeWegingExamen: bepaalAfwijkendeWegingExamen(resultaat.wegingVoortgang, resultaat.wegingExamen),
                resultaatkolomId: resultaat.geldendResultaat.resultaatkolom,
                dossierType: resultaat.geldendResultaat.dossierType,
                heeftHerkansing: resultaat.heeftHerkansing,
                pogingen: resultaat.pogingen,
                isAlternatief: isAlternatiefNiveau
            },
            pogingTooltipOmschrijving: getPogingTooltipOmschrijving(resultaat.geldendResultaat.herkansingssoort, resultaat.pogingen)
        };
    }
}

function bepaalAfwijkendeWegingExamen(wegingVoortgang?: string, wegingExamen?: string): string | undefined {
    // Alleen als we 2 wegingen hebben, kan er een afwijking zijn.
    if (!wegingExamen || !wegingVoortgang) {
        return undefined;
    }

    if (wegingVoortgang === wegingExamen) {
        return undefined;
    }

    return wegingExamen;
}
