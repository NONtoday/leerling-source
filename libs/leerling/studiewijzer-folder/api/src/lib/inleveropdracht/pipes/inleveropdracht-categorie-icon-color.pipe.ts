import { Pipe, PipeTransform } from '@angular/core';
import { PillTagColor } from 'harmony';
import { InleveropdrachtCategorie } from 'leerling/store';

@Pipe({
    name: 'inleveropdrachtCategorieIconColor',
    standalone: true
})
export class InleveropdrachtCategorieIconColorPipe implements PipeTransform {
    transform(status: InleveropdrachtCategorie): PillTagColor {
        switch (status) {
            case 'AANKOMEND':
                return 'neutral';
            case 'IN_TE_LEVEREN':
                return 'primary';
            case 'IN_AFWACHTING':
                return 'accent';
            case 'AKKOORD':
                return 'positive';
            default:
                return 'primary';
        }
    }
}
