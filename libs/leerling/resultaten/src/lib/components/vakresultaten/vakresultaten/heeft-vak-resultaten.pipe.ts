import { Pipe, PipeTransform } from '@angular/core';
import { VakresultatenView } from './vakresultaten.component';

@Pipe({
    name: 'heeftVakResultaten',
    standalone: true
})
export class HeeftVakResultaten implements PipeTransform {
    transform(view: VakresultatenView): boolean {
        if (view.actieveTab === 'Examen' && view.vakToetsdossier?.examendossier?.heeftResultaten) {
            return true;
        }
        if (view.actieveTab === 'Alternatief' && view.vakToetsdossier?.voortgangsdossier?.alternatiefNiveau?.heeftResultaten) return true;
        if (view.actieveTab === 'Rapport' || view.actieveTab === 'Standaard') {
            if (view.vakToetsdossier?.voortgangsdossier?.standaardNiveau?.heeftResultaten) return true;
        }
        return false;
    }
}
