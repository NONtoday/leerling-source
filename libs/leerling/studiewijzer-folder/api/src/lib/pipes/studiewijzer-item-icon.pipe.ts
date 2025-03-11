import { Pipe, PipeTransform } from '@angular/core';
import { IconName } from 'harmony-icons';
import { SStudiewijzerItem } from 'leerling/store';

@Pipe({
    name: 'studiewijzerItemIcon',
    standalone: true
})
export class StudiewijzerItemIconPipe implements PipeTransform {
    transform(item: SStudiewijzerItem): IconName {
        if (item.isInleveropdracht) return 'inleveropdracht';

        switch (item.huiswerkType) {
            case 'LESSTOF':
                return 'lesstof';
            case 'TOETS':
                return 'toets';
            case 'GROTE_TOETS':
                return 'toetsGroot';
            default:
                return 'huiswerk';
        }
    }
}
