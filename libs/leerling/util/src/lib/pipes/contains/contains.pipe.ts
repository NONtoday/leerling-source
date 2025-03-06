import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'slContains',
    standalone: true
})
export class SlContainsPipe implements PipeTransform {
    transform<T>(values: T[], value: T): boolean {
        return values.includes(value);
    }
}
