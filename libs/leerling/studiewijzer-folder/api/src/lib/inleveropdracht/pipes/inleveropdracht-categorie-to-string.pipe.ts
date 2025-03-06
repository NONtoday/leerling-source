import { Pipe, PipeTransform } from '@angular/core';
import { InleveropdrachtCategorie } from 'leerling/store';
@Pipe({
    name: 'inleveropdrachtCategorieToString',
    standalone: true
})
export class InleveropdrachtCategorieToStringPipe implements PipeTransform {
    transform(inleveropdrachtStatus: InleveropdrachtCategorie): string {
        switch (inleveropdrachtStatus) {
            case 'AANKOMEND':
                return 'Aankomend';
            case 'IN_TE_LEVEREN':
                return 'In te leveren';
            case 'IN_AFWACHTING':
                return 'In afwachting';
            case 'AKKOORD':
                return 'Akkoord';
        }
    }
}
