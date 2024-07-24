import { Pipe, PipeTransform } from '@angular/core';
import { VakresultatenView } from './vakresultaten.component';

@Pipe({
    name: 'heeftAndereVakResultaten',
    standalone: true
})
export class HeeftAndereVakResultaten implements PipeTransform {
    transform(view: VakresultatenView): boolean {
        if (view.actieveTab === 'Rapport' && view.tabs.includes('Examen') && view.vakToetsdossier?.examendossier?.heeftResultaten)
            return true;
        else if (
            view.actieveTab === 'Standaard' &&
            view.tabs.includes('Alternatief') &&
            view.vakToetsdossier?.voortgangsdossier?.alternatiefNiveau?.heeftResultaten
        )
            return true;
        return false;
    }
}
