import { Pipe, PipeTransform } from '@angular/core';
import { GESLACHT, SMedewerker } from 'leerling/store';
import { match } from 'ts-pattern';

@Pipe({
    name: 'medewerkerVolledigeNaam',
    standalone: true
})
export class MedewerkerVolledigeNaamPipe implements PipeTransform {
    transform(medewerker: SMedewerker, options?: MedewerkerNaamOptions): string {
        return getVolledigeNaamMedewerker(medewerker, options);
    }
}

function getAanhef(geslacht: GESLACHT): string {
    return match(geslacht)
        .with('MAN', () => 'Dhr.')
        .with('VROUW', () => 'Mevr.')
        .with('ONBEKEND', () => '')
        .exhaustive();
}
export type MedewerkerNaamOptions = {
    metAanhef?: boolean;
    metAfkorting?: boolean;
};

export function getVolledigeNaamMedewerker(medewerker: SMedewerker, options?: MedewerkerNaamOptions): string {
    const aanhef = options?.metAanhef ? getAanhef(medewerker.geslacht) : '';
    const afkorting = options?.metAfkorting && medewerker.afkorting ? `(${medewerker.afkorting})` : '';
    return [aanhef, medewerker.voorletters, medewerker.voorvoegsel, medewerker.achternaam, afkorting].filter(Boolean).join(' ');
}
