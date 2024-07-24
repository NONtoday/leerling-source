import { Pipe, PipeTransform } from '@angular/core';
import { ToHuiswerkTypenPipe } from '../../werkdruk-indicator/huiswerk-typen.pipe';
import { DayDateTab } from './dag-header.component';

@Pipe({
    name: 'dagHeaderAriaLabel',
    standalone: true
})
export class DagHeaderAriaLabelPipe implements PipeTransform {
    private _huiswerkTypenPipe = new ToHuiswerkTypenPipe();

    transform(value: DayDateTab): string {
        const huiswerkTypen = this._huiswerkTypenPipe.transform(value.dagEnWeekItems);
        const actieveTypen = [
            huiswerkTypen.heeftHuiswerk ? 'huiswerk' : null,
            huiswerkTypen.heeftGroteToets ? 'grote toets' : null,
            huiswerkTypen.heeftToets ? 'toets' : null,
            huiswerkTypen.heeftInleveropdracht ? 'inleveropdracht' : null
        ].filter(Boolean);
        return actieveTypen.length > 0 ? `${value.description}, heeft ${actieveTypen.join(', ')}` : value.description;
    }
}
