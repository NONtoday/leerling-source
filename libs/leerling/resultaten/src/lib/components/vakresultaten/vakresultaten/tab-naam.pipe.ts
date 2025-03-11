import { Pipe, PipeTransform } from '@angular/core';
import { VakToetsdossier } from '../../../services/vakresultaten/vakresultaten-model';
import { VakResultaatTab } from './vakresultaten.component';

@Pipe({
    name: 'tabNaam',
    standalone: true
})
export class TabNaamPipe implements PipeTransform {
    transform(tab: VakResultaatTab, vakToetsdossier: VakToetsdossier): string {
        if (tab === 'Alternatief') return vakToetsdossier?.voortgangsdossier?.alternatiefNiveau?.naam || 'Alternatief';
        if (tab === 'Standaard') return vakToetsdossier?.voortgangsdossier?.standaardNiveau?.naam || 'Standaard';
        return tab;
    }
}
