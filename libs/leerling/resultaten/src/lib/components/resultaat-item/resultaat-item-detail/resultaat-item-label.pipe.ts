import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'resultaatItemAriaLabel',
    standalone: true
})
export class ResultaatItemAriaLabelPipe implements PipeTransform {
    transform(weging: string | undefined): string | undefined {
        if (!weging) return weging;

        return weging.replace('x', ' keer');
    }
}
