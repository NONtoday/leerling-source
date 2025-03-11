import { Pipe, PipeTransform } from '@angular/core';
import { SStudiewijzerItem } from 'leerling/store';

export interface HuiswerkTypen {
    heeftGroteToets: boolean;
    heeftToets: boolean;
    heeftHuiswerk: boolean;
    heeftInleveropdracht: boolean;
}

@Pipe({
    name: 'huiswerkTypen',
    standalone: true
})
export class ToHuiswerkTypenPipe implements PipeTransform {
    transform(items: SStudiewijzerItem[]): HuiswerkTypen {
        return (items ?? []).reduce(
            (previousValue, item) => ({
                heeftHuiswerk: previousValue.heeftHuiswerk || (!item.isInleveropdracht && item.huiswerkType === 'HUISWERK'),
                heeftGroteToets: previousValue.heeftGroteToets || (!item.isInleveropdracht && item.huiswerkType === 'GROTE_TOETS'),
                heeftToets: previousValue.heeftToets || (!item.isInleveropdracht && item.huiswerkType === 'TOETS'),
                heeftInleveropdracht: previousValue.heeftInleveropdracht || item.isInleveropdracht
            }),
            {
                heeftHuiswerk: false,
                heeftGroteToets: false,
                heeftToets: false,
                heeftInleveropdracht: false
            }
        );
    }
}
