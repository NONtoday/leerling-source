import { Pipe, PipeTransform } from '@angular/core';
import { RPortaalToestemming } from 'leerling-codegen';

@Pipe({
    name: 'portaalToestemmingOmschrijving',
    standalone: true
})
export class PortaalToestemmingOmschrijvingPipe implements PipeTransform {
    transform(portaalToestemming: RPortaalToestemming | undefined): string {
        const verozrger = portaalToestemming?.verzorger;
        return verozrger ? [verozrger.voorletters, verozrger.voorvoegsel, verozrger.achternaam].filter(Boolean).join(' ') : '-';
    }
}
