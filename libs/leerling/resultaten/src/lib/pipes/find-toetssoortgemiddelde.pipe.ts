import { Pipe, PipeTransform } from '@angular/core';
import { SToetssoortGemiddeldeResultaat } from 'leerling/store';

@Pipe({
    name: 'findToetssoortgemiddelde',
    standalone: true
})
export class FindToetssoortGemiddeldePipe implements PipeTransform {
    transform(elements: SToetssoortGemiddeldeResultaat[], toetssoort: string): SToetssoortGemiddeldeResultaat | undefined {
        return elements.find((element) => element.toetssoortafkorting === toetssoort);
    }
}
