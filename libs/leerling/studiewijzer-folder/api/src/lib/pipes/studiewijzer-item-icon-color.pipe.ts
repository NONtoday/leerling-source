import { Pipe, PipeTransform } from '@angular/core';
import { ColorToken } from 'harmony';
import { SStudiewijzerItem } from 'leerling/store';

@Pipe({
    name: 'studiewijzerItemIconColor',
    standalone: true
})
export class StudiewijzerItemIconColorPipe implements PipeTransform {
    transform(item: SStudiewijzerItem, afgevinkt?: boolean): ColorToken {
        if (afgevinkt || (afgevinkt === undefined && item.gemaakt)) return 'fg-on-positive-weak';
        if (item.isInleveropdracht) return 'fg-alternative-normal';
        switch (item.huiswerkType) {
            case 'LESSTOF':
                return 'fg-positive-normal';
            case 'TOETS':
                return 'fg-warning-normal';
            case 'GROTE_TOETS':
                return 'fg-negative-normal';
            default:
                return 'fg-primary-normal';
        }
    }
}
