import { Pipe, PipeTransform } from '@angular/core';
import { IconName } from 'harmony-icons';
import { InleveropdrachtCategorie } from 'leerling/store';

@Pipe({
    name: 'inleveropdrachtCategorieIconName',
    standalone: true
})
export class InleveropdrachtCategorieIconNamePipe implements PipeTransform {
    transform(status: InleveropdrachtCategorie): IconName {
        switch (status) {
            case 'IN_TE_LEVEREN':
                return 'inbox';
            case 'IN_AFWACHTING':
                return 'tijd';
            case 'AKKOORD':
                return 'check';
            default:
                return 'inbox';
        }
    }
}
