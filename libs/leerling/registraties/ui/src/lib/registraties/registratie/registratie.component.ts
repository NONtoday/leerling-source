import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Signal, computed, inject, input, signal } from '@angular/core';
import { collapseAnimation } from 'angular-animations';
import { isSameDay } from 'date-fns';
import { IconDirective, IconPillComponent, isPresent, vakIcons } from 'harmony';
import { IconChevronRechts, provideIcons } from 'harmony-icons';
import { SRegistratie, SRegistratieCategorieNaam } from 'leerling-registraties-models';
import { VakToIconPipe, formatDateNL } from 'leerling-util';
import { SAfspraakItem } from 'leerling/store';
import { isEqual, orderBy } from 'lodash-es';
import { P, match } from 'ts-pattern';

interface Lesuur {
    begin?: number;
    eind?: number;
}

type RegistratieAfspraak = SAfspraakItem & {
    tijdspanne: string;
    vakOfTitel: string;
};

interface DatumAfspraken {
    datum: string;
    afspraken: RegistratieAfspraak[];
}

@Component({
    selector: 'sl-registratie',
    imports: [CommonModule, IconPillComponent, VakToIconPipe, IconDirective],
    templateUrl: './registratie.component.html',
    styleUrl: './registratie.component.scss',
    providers: [provideIcons(...vakIcons, IconChevronRechts)],
    animations: [collapseAnimation()],
    host: {
        '[class.geen-padding-bottom]': 'removePaddingBottom()',
        '[attr.aria-label]': 'ariaLabel()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistratieComponent implements OnInit {
    private _elementRef = inject(ElementRef);

    registratie = input.required<SRegistratie>();
    categorie = input.required<SRegistratieCategorieNaam>();

    private _canvasContext = document.createElement('canvas').getContext('2d');

    ngOnInit() {
        if (this._canvasContext) {
            this._canvasContext.font = window
                .getComputedStyle(this._elementRef.nativeElement)
                .getPropertyValue('--body-content-small-regular');
        }
    }

    lesuur: Signal<Lesuur> = computed(() => {
        const afspraken = this._afspraken();
        return afspraken.length === 1 ? { begin: afspraken[0].beginLesuur, eind: afspraken[0].eindLesuur } : {};
    });

    titel = computed(() =>
        match(this.categorie())
            .with('Afwezig', 'Afwezig geoorloofd', 'Afwezig ongeoorloofd', () => this.registratie().omschrijving)
            .with(
                'Te laat',
                'Verwijderd uit les',
                'Huiswerk niet in orde',
                'Materiaal niet in orde',
                () => this.vakTitelOfOmschrijving() ?? this.registratie().omschrijving
            )
            .exhaustive()
    );

    datuminfo = computed(() =>
        match(this.categorie())
            .with('Afwezig', 'Afwezig geoorloofd', 'Afwezig ongeoorloofd', () => this._afwezigDatum())
            .with('Te laat', 'Verwijderd uit les', () => dagUitgeschreven(this.registratie().begin))
            .with('Huiswerk niet in orde', 'Materiaal niet in orde', () => zonderEinddatumMetLesuur(this.registratie(), this.lesuur()))
            .exhaustive()
    );

    minutenGemistInfo = computed(() =>
        match(this.categorie())
            .with('Te laat', 'Verwijderd uit les', () => this._tijdMetMinutenGemist())
            .otherwise(() => undefined)
    );

    toonIconAlsTitel = computed(() =>
        match(this.categorie())
            .with('Afwezig', 'Afwezig geoorloofd', 'Afwezig ongeoorloofd', () => false)
            .with('Te laat', 'Verwijderd uit les', () => this.registratie().afspraken.length === 1)
            .with('Huiswerk niet in orde', 'Materiaal niet in orde', () => true)
            .exhaustive()
    );

    toonVakOnderDatum = computed(() => !this.toonIconAlsTitel() && this.aantalAfspraken() === 1);

    private _afspraken = computed(() =>
        this.registratie().afspraken.map(
            (afspraak) =>
                ({
                    ...afspraak,
                    vakOfTitel: afspraak?.vak?.naam ?? afspraak.titel,
                    tijdspanne: this._bepaalTijdspanne(afspraak)
                }) satisfies RegistratieAfspraak
        )
    );

    vakTitelOfOmschrijving = computed(() => {
        const afspraken = this._afspraken();
        return afspraken.length === 1 ? (afspraken[0].vak?.naam ?? afspraken[0].titel ?? this.registratie().omschrijving) : undefined;
    });

    aantalAfspraken = computed(() => this._afspraken().length);
    datumAfspraken = computed(() => this._mapNaarDatumAfspraken(this._afspraken()));
    tijdspanneWidth = computed(() => {
        const max = Math.max(...this._afspraken().map((afspraak) => this._canvasContext?.measureText(afspraak.tijdspanne).width ?? 0));
        return max ? `${max}px` : 'auto';
    });
    afsprakenOpen = signal(false);

    removePaddingBottom = computed(() => !this.afsprakenOpen() && this.aantalAfspraken() > 1);

    private _afwezigDatum = computed(() => {
        const beginDatum = this.registratie().begin;
        const eindDatum = this.registratie().eind;
        if (!eindDatum) {
            return langMetTijd(beginDatum);
        }

        if (!isSameDay(eindDatum, beginDatum)) {
            return `${dagKortMetTijd(beginDatum)} t/m ${dagKortMetTijd(eindDatum)}`;
        }

        const beginLesuur = this.lesuur().begin;
        const eindLesuur = this.lesuur().eind;
        if (isPresent(beginLesuur)) {
            const start = dagKortMetLesuur(beginDatum, beginLesuur);
            if (beginLesuur === eindLesuur) {
                return `${start} uur`;
            } else {
                return `${start} - ${eindLesuur}e uur`;
            }
        } else {
            return `${dagKortMetTijd(beginDatum)} t/m ${tijd(eindDatum)}`;
        }
    });

    private _tijdMetMinutenGemist = computed(() => {
        const minutenGemist = this.registratie().minutenGemist ? `, ${this.registratie().minutenGemist} min gemist` : '';
        const beginLesuur = this.lesuur().begin;
        const eindLesuur = this.lesuur().eind;
        const eindDatum = this.registratie().eind;

        if (isPresent(beginLesuur)) {
            if (beginLesuur === eindLesuur) {
                return `${beginLesuur}e uur${minutenGemist}`;
            } else {
                return `${beginLesuur}e - ${eindLesuur}e uur${minutenGemist}`;
            }
        }
        if (eindDatum) {
            return `${tijd(this.registratie().begin)} - ${tijd(eindDatum)}${minutenGemist}`;
        }

        return `${tijd(this.registratie().begin)}${minutenGemist}`;
    });

    private _mapNaarDatumAfspraken(afspraken: RegistratieAfspraak[]): DatumAfspraken[] {
        const result: DatumAfspraken[] = [];
        let huidigeDatum: string | undefined = undefined;
        orderBy(afspraken, ['beginDatumTijd', 'eindDatumTijd'], 'asc').forEach((afspraak) => {
            const datum = dagUitgeschreven(afspraak.beginDatumTijd);

            if (isEqual(datum, huidigeDatum)) {
                result[result.length - 1].afspraken.push(afspraak);
            } else {
                huidigeDatum = datum;
                result.push({
                    datum: datum,
                    afspraken: [afspraak]
                });
            }
        });
        return result;
    }

    private _bepaalTijdspanne(afspraak: SAfspraakItem): string {
        if (isPresent(afspraak.beginLesuur)) {
            const afwijkendEindLesuur =
                isPresent(afspraak.eindLesuur) && afspraak.eindLesuur !== afspraak.beginLesuur ? afspraak.eindLesuur : undefined;
            return (
                [afspraak.beginLesuur, afwijkendEindLesuur]
                    .filter(isPresent)
                    .map((uur) => `${uur}e`)
                    .join(' - ') + ' uur'
            );
        }

        return `${tijd(afspraak.beginDatumTijd)} - ${tijd(afspraak.eindDatumTijd)}`;
    }

    ariaLabel = computed(() =>
        [
            this.titel(),
            this.registratie().afgehandeld ? undefined : 'niet afgehandeld',
            this.datuminfo(),
            this.minutenGemistInfo(),
            this.toonVakOnderDatum() ? this.vakTitelOfOmschrijving() : undefined
        ]
            .filter(isPresent)
            .map((part) => part.replace('-', 'tot'))
            .join(', ')
    );
}

const zonderEinddatumMetLesuur = (registratie: SRegistratie, lesuur: Lesuur) =>
    match(lesuur.begin)
        .with(P.nonNullable, (beginLesuur) => `${dagUitgeschreven(registratie.begin)}, ${beginLesuur}e uur`)
        .otherwise(() => `${dagUitgeschreven(registratie.begin)}, ${tijd(registratie.begin)}`);

const tijd = (datum: Date) => formatDateNL(datum, 'tijd');
const langMetTijd = (datum: Date) => `${formatDateNL(datum, 'dag_uitgeschreven_dagnummer_maand_kort')}, ${tijd(datum)}`;
const dagKort = (datum: Date) => formatDateNL(datum, 'dag_kort_dagnummer_maand_kort');
const dagKortMetTijd = (datum: Date) => `${dagKort(datum)}, ${formatDateNL(datum, 'tijd')}`;
const dagKortMetLesuur = (datum: Date, lesuur: number) => `${dagKort(datum)}, ${lesuur}e`;
const dagUitgeschreven = (datum: Date) => formatDateNL(datum, 'dag_uitgeschreven_dagnummer_maand_kort');
