import { Pipe, PipeTransform } from '@angular/core';
import { SAfspraakActie } from 'leerling/store';
import { MedewerkerAanhefAriaLabelPipe } from '../rooster-item-detail/medewerker-aanhef-aria-label.pipe';
import { toInschrijfdatumPipe } from '../rooster-kwt-keuze/to-inschrijfdatum-pipe';
import { toLestijdPipe } from '../rooster-kwt-keuze/to-lestijd.pipe';

@Pipe({
    name: 'kwtKeuzeAriaLabel',
    standalone: true
})
export class kwtKeuzeAriaLabelPipe implements PipeTransform {
    transform(afspraakActie: SAfspraakActie, isGekozen: boolean): string {
        const inschrijfDatumPipe = new toInschrijfdatumPipe();
        const lestijdPipe = new toLestijdPipe();

        const titel = afspraakActie.titel;
        const aantalPlekkenLabel = isGekozen ? 'Gekozen' : getBeschikbarePlekkenAriaLabel(afspraakActie.beschikbarePlaatsen);
        const inschrijfDatumLabel = inschrijfDatumPipe.transform(afspraakActie);
        const lestijdLabel = lestijdPipe.transform(afspraakActie, true);
        let ariaLabel = `${titel}, ${aantalPlekkenLabel}, ${inschrijfDatumLabel}, ${lestijdLabel}`;

        if (afspraakActie.locatie) {
            const locatieLabel = ` Locatie: ${afspraakActie.locatie},`;
            ariaLabel += locatieLabel;
        }

        if (afspraakActie.vak) {
            const vakLabel = ` Vak: ${afspraakActie.vak.naam},`;
            ariaLabel += vakLabel;
        }

        if (afspraakActie.docentNamen && afspraakActie.docentNamen.length > 0) {
            ariaLabel = getDocentAriaLabel(afspraakActie.docentNamen, ariaLabel);
        }

        if (afspraakActie.omschrijving) {
            const omschrijvingLabel = ` Omschrijving: ${afspraakActie.omschrijving}.`;
            ariaLabel += omschrijvingLabel;
        }

        return ariaLabel;
    }
}

function getBeschikbarePlekkenAriaLabel(plekken: number | undefined): string {
    if (!plekken) return '';
    if (plekken === 1) {
        return 'Nog 1 plek';
    } else {
        return plekken < 4 ? `Nog ${plekken} plekken` : `${plekken} plekken`;
    }
}

function getDocentAriaLabel(docentNamen: string[], ariaLabel: string): string {
    const medewerkerPipe = new MedewerkerAanhefAriaLabelPipe();
    let ariaLabelDocenten = ariaLabel;

    docentNamen.forEach((docent, index) => {
        if (index === 0) {
            const docentenLabel = ` ${docentNamen.length === 1 ? 'Docent:' : 'Docenten:'} ${medewerkerPipe.transform(docent)},`;
            return (ariaLabelDocenten += docentenLabel);
        }

        return (ariaLabelDocenten += ` ${medewerkerPipe.transform(docent)},`);
    });

    return ariaLabelDocenten;
}
