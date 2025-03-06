import { Pipe, PipeTransform } from '@angular/core';
import { InleveropdrachtCategorie } from 'leerling/store';

@Pipe({
    name: 'inleveropdrachtCategorieEmptyState',
    standalone: true
})
export class InleveropdrachtCategorieEmptyStatePipe implements PipeTransform {
    transform(status: InleveropdrachtCategorie): string {
        switch (status) {
            case 'AANKOMEND':
                return 'Er zijn geen aankomende inleveropdrachten';
            case 'IN_TE_LEVEREN':
                return 'Er zijn geen opdrachten om in te leveren';
            case 'IN_AFWACHTING':
                return 'Er zijn geen inleveropdrachten in afwachting';
            case 'AKKOORD':
                return 'Er zijn geen geaccordeerde inleveropdrachten';
        }
    }
}
