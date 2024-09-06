import { Pipe, PipeTransform } from '@angular/core';
import { isEmpty } from 'lodash-es';
import { VoortgangsPeriode } from '../../../services/vakresultaten/vakresultaten-model';

@Pipe({
    name: 'periodeNaam',
    standalone: true
})
export class PeriodeNaamPipe implements PipeTransform {
    transform(periode: VoortgangsPeriode): string {
        return periode.afkorting && !isEmpty(periode.afkorting.trim()) ? periode.afkorting : String(periode.periode);
    }
}
