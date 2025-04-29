import { Pipe, PipeTransform } from '@angular/core';
import { differenceInWeeks } from 'date-fns';
import { formatDateNL } from 'harmony';
import { HerhaalDag, SHerhalendeAfspraak } from 'leerling/store';

@Pipe({
    name: 'kwtHerhalingLabel',
    standalone: true
})
export class kwtHerhalingLabelPipe implements PipeTransform {
    transform(herhaling: SHerhalendeAfspraak): string {
        if (!herhaling.eindDatum) return '';
        const aantalHerhalingen = herhaling.maxHerhalingen;
        const herhaalDagen = getHerhaaldagen(herhaling.afspraakHerhalingDagen);
        const label = `Je schrijft je automatisch in voor ${aantalHerhalingen} andere ${aantalHerhalingen === 1 ? 'moment' : 'momenten'}`;

        if (herhaling.type === 'DAGELIJKS') {
            const isDagHerhaling = herhaling.afspraakHerhalingDagen.includes('DAG');
            return `${label}, elke ${isDagHerhaling ? 'dag' : 'werkdag'} tot ${formatDateNL(herhaling.eindDatum, 'dagnummer_maand_lang_zonder_jaar')}.`;
        }

        if (herhaling.type === 'WEKELIJKS') {
            const verschilInWeken = Math.abs(differenceInWeeks(herhaling.beginDatum, herhaling.eindDatum, { roundingMethod: 'floor' }));
            return `${label} op ${herhaalDagen} komende ${verschilInWeken} weken.`;
        }

        if (herhaling.type === 'MAANDELIJKS') {
            return `${label}, elke ${herhaling.skip}e ${herhaalDagen} van de maand.`;
        }

        return label;
    }
}

function getHerhaaldagen(herhaalDagen: HerhaalDag[]): string {
    const teVerwijdernHerhaalDagen: string[] = ['DAG', 'WERKDAG'];
    const nieuweHerhaaldagen = herhaalDagen.filter((string) => !teVerwijdernHerhaalDagen.includes(string));
    const lowercaseherhaalDagen = nieuweHerhaaldagen.map((string) => string.toLowerCase());
    return lowercaseherhaalDagen.join(',').replace(/,/g, ', ');
}
