import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'studiewijzerItemTop',
    standalone: true
})
export class StudiewijzerItemTopPipe implements PipeTransform {
    transform(index: number, isStacked: boolean): string | undefined {
        return isStacked ? undefined : `calc(${index} * var(--item-height) + ${index} * 4px)`;
    }
}
