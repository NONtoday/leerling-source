import { Pipe, PipeTransform } from '@angular/core';
import { ResultaatItem } from '../resultaat-item-model';

@Pipe({
    name: 'resultaatItemAriaLabel',
    standalone: true
})
export class ResultaatItemAriaLabelPipe implements PipeTransform {
    transform(resultaatItem: ResultaatItem): string {
        const labelVelden = [resultaatItem.titel, resultaatItem.titelPostfix, resultaatItem.resultaat, resultaatItem.subtitel];

        if (resultaatItem.weging) labelVelden.push('Weging: ' + resultaatItem.weging.replace('x', ' keer'));
        if (resultaatItem.toetstype === 'SamengesteldeToetsKolom') labelVelden.push('Toets bevat deeltoetsen');
        if (resultaatItem.isHerkansing) labelVelden.push('Cijfer is een herkansing');
        if (resultaatItem.heeftOpmerking) labelVelden.push('Cijfer heeft een opmerking');

        return labelVelden.filter((veld) => !!veld).join(', ');
    }
}
