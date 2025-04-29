import { Pipe, PipeTransform } from '@angular/core';
import { HmyDatePipe } from 'harmony';
import { SInlevering } from 'leerling/store';

@Pipe({
    name: 'inleveringOndertitel',
    standalone: true
})
export class InleveringOndertitelPipe implements PipeTransform {
    private _datePipe = new HmyDatePipe();

    public transform(inlevering: SInlevering): string | undefined {
        return [
            'Ingeleverd op',
            this._datePipe.transform(inlevering.verzendDatum, 'dag_kort_dagnummer_maand_kort_tijd_lowercase'),
            inlevering.projectgroepInleveraar ? `door ${inlevering.projectgroepInleveraar}` : undefined
        ].join(' ');
    }
}
