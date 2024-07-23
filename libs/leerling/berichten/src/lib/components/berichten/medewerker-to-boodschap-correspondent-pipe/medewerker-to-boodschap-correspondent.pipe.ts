import { Pipe, PipeTransform } from '@angular/core';
import { SBoodschapCorrespondent, SMedewerker } from 'leerling/store';
import { getVolledigeNaamMedewerker } from '../medewerker-volledige-naam-pipe/medewerker-volledige-naam.pipe';

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
