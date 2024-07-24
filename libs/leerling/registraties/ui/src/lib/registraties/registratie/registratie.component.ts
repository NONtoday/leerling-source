import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { isSameDay } from 'date-fns';
import { IconDirective, IconPillComponent, provideVakIcons } from 'harmony';
import { SRegistratie, SRegistratieCategorieNaam } from 'leerling-registraties-models';
import { VakToIconPipe, formatDateNL } from 'leerling-util';
import { P, match } from 'ts-pattern';

@Component({
    selector: 'sl-registratie',
    standalone: true,
    imports: [CommonModule, IconPillComponent, VakToIconPipe, IconDirective],
    templateUrl: './registratie.component.html',
    styleUrl: './registratie.component.scss',
    providers: [provideVakIcons],
    host: {
        '[attr.aria-label]': 'ariaLabel()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistratieComponent {
    registratie = input.required<SRegistratie>();
    categorie = input.required<SRegistratieCategorieNaam>();

    titel = computed(() =>
        match(this.categorie())
            .with('Afwezig geoorloofd', 'Afwezig ongeoorloofd', 'Te laat', () => this.registratie().absentieReden ?? this.categorie())
            .with('Verwijderd uit les', 'Huiswerk niet in orde', 'Materiaal niet in orde', () => this.registratie().vakOfTitel)
            .exhaustive()
    );

    datuminfo = computed(() =>
        match(this.categorie())
            .with('Afwezig geoorloofd', 'Afwezig ongeoorloofd', () => this.afwezigDatum())
            .with('Te laat', 'Verwijderd uit les', () => dagMetMinutenGemist(this.registratie()))
            .with('Huiswerk niet in orde', 'Materiaal niet in orde', () => zonderEinddatumMetLesuur(this.registratie()))
            .exhaustive()
    );

    showIconInPill = computed(() =>
        match(this.categorie())
            .with('Afwezig geoorloofd', 'Afwezig ongeoorloofd', 'Te laat', () => true)
            .with('Verwijderd uit les', 'Huiswerk niet in orde', 'Materiaal niet in orde', () => false)
            .exhaustive()
    );

    private afwezigDatum = computed(() => {
        const einddatum = this.registratie().eindDatumTijd;
        const begindatum = this.registratie().beginDatumTijd;
        const beginLesuur = this.registratie().beginLesuur;
        const eindLesuur = this.registratie().eindLesuur;

        const zelfdeDag = !einddatum || isSameDay(einddatum, this.registratie().beginDatumTijd);

        const start = match({ zelfdeDag, beginLesuur })
            .with({ zelfdeDag: false, beginLesuur: P.nullish }, () => dagKortMetTijd(begindatum))
            .with({ zelfdeDag: false, beginLesuur: P.select(P.nonNullable) }, (beginUur) => dagKortMetLesuur(begindatum, beginUur))
            .with({ zelfdeDag: true, beginLesuur: P.nullish }, () => langMetTijd(begindatum))
            .with({ zelfdeDag: true, beginLesuur: P.select(P.nonNullable) }, (beginuur) => langMetUren(begindatum, beginuur))
            .exhaustive();

        if (!einddatum) return `${start} ${beginLesuur ? 'uur' : ''}`;

        const suffix = match({ zelfdeDag, eindLesuur })
            .with({ zelfdeDag: true, eindLesuur: P.select(P.nonNullable) }, (einduur) => ` - ${einduur}e uur`)
            .with(
                { zelfdeDag: false, eindLesuur: P.select(P.nonNullable) },
                (einduur) => ` t/m ${dagKortMetLesuur(einddatum, einduur)} uur`
            )
            .with({ zelfdeDag: false }, () => ' t/m ' + dagKortMetTijd(einddatum))
            .with({ zelfdeDag: true }, () => ` - ${tijd(einddatum)}`)
            .exhaustive();

        return start + suffix;
    });

    ariaLabel = computed(
        () => `${this.titel()}, ${this.datuminfo()}, ${this.registratie().vakOfTitel}, ${this.registratie().opmerkingen ?? ''}`
    );
}

const zonderEinddatumMetLesuur = (registratie: SRegistratie) =>
    `${dagUitgeschreven(registratie.beginDatumTijd)}, ${registratie.beginLesuur}e uur`;
const tijd = (datum: Date) => formatDateNL(datum, 'tijd');
const langMetTijd = (datum: Date) => `${formatDateNL(datum, 'dag_uitgeschreven_dagnummer_maand_kort')}, ${tijd(datum)}`;
const langMetUren = (datum: Date, beginLesuur: number) =>
    `${formatDateNL(datum, 'dag_uitgeschreven_dagnummer_maand_kort')}, ${beginLesuur}e`;

const dagKort = (datum: Date) => formatDateNL(datum, 'dag_kort_dagnummer_maand_kort');
const dagKortMetTijd = (datum: Date) => `${dagKort(datum)}, ${formatDateNL(datum, 'tijd')}`;
const dagKortMetLesuur = (datum: Date, lesuur: number) => `${dagKort(datum)}, ${lesuur}e`;
const dagUitgeschreven = (datum: Date) => formatDateNL(datum, 'dag_uitgeschreven_dagnummer_maand_kort');
const dagMetMinutenGemist = (registratie: SRegistratie) =>
    `${dagUitgeschreven(registratie.beginDatumTijd)}, ${registratie.minutenGemist ?? 0} min gemist`;
