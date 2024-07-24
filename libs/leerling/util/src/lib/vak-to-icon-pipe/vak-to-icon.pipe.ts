import { Pipe, PipeTransform } from '@angular/core';
import { getIconVoorVak } from 'harmony';
import { IconName } from 'harmony-icons';

@Pipe({
    name: 'vakToIcon',
    standalone: true
})
export class VakToIconPipe implements PipeTransform {
    transform(keyword: string): IconName {
        return getIconVoorVak(keyword);
    }
}
