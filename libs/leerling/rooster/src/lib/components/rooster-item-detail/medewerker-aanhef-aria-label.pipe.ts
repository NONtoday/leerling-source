import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'medewerkerAanhefAriaLabel',
    standalone: true
})
export class MedewerkerAanhefAriaLabelPipe implements PipeTransform {
    transform(medewerker: string): string {
        return medewerker.toLowerCase().replace('dhr.', 'de heer').replace('mevr.', 'mevrouw');
    }
}
