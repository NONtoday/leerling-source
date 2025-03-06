import { Pipe, PipeTransform } from '@angular/core';
import { getVolledigeNaamMedewerker } from 'leerling-berichten-api';
import { SBoodschapCorrespondent, SMedewerker } from 'leerling/store';

@Pipe({
    name: 'medewerkerToBoodschapCorrespondent',
    standalone: true
})
export class MedewerkerToBoodschapCorrespondentPipe implements PipeTransform {
    transform(medewerker: SMedewerker): SBoodschapCorrespondent {
        return mapSMedewerkerToSBoodschapCorrespondent(medewerker);
    }
}

export function mapSMedewerkerToSBoodschapCorrespondent(medewerker: SMedewerker): SBoodschapCorrespondent {
    return {
        naam: getVolledigeNaamMedewerker(medewerker, { metAanhef: true, metAfkorting: true }),
        sorteerNaam: `${medewerker.achternaam}${medewerker.voorletters}`,
        initialen: medewerker.voorletters,
        vakken: medewerker.vakken
    };
}
