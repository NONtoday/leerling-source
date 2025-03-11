import { ChangeDetectionStrategy, Component, computed, input, model, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { differenceInWeeks, isBefore, isSameDay, previousSunday } from 'date-fns';
import { DropdownComponent, DropdownItem, IconDirective, isPresent, ToggleComponent } from 'harmony';
import { IconChevronOnder, provideIcons } from 'harmony-icons';
import { first, isEqual, last } from 'lodash-es';
import {
    createTijdOptiesMinuten,
    createTijdOptiesUren,
    createWeekOpties,
    DagOptie,
    TijdOptieMinuten,
    TijdOptieUren
} from '../afwezig-melden-model';

@Component({
    selector: 'sl-datum-selectie',
    standalone: true,
    imports: [FormsModule, ToggleComponent, IconDirective, DropdownComponent],
    providers: [provideIcons(IconChevronOnder)],
    templateUrl: './datum-selectie.component.html',
    styleUrl: './datum-selectie.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DatumSelectieComponent implements OnInit {
    // selectie door gebruiker
    beginDag = model<DagOptie>();
    beginTijdMinuten = model<TijdOptieMinuten>();
    beginTijdUren = model<TijdOptieUren>();
    eindDag = model<DagOptie>();
    eindTijdMinuten = model<TijdOptieMinuten>();
    eindTijdUren = model<TijdOptieUren>();

    // inputs
    eindDatumVerplicht = input.required<boolean>();
    fromDate = input(new Date()); // maakt testen makkelijker
    magTijdstipKiezen = input.required<boolean>();
    mode = input.required<DatumSelectieMode>();

    // opties
    minutenDropdownItems = computed<DropdownItem<TijdOptieMinuten>[]>(() => this.createMinutenDropdownItems());
    selectedMinutenDropdownItem = computed<DropdownItem<TijdOptieMinuten> | undefined>(() => {
        const selected = this.mode() === 'Begin' ? this.beginTijdMinuten() : this.eindTijdMinuten();
        return this.minutenDropdownItems().find((item) => item.data.minuten === selected?.minuten);
    });
    urenDropdownItems = computed<DropdownItem<TijdOptieUren>[]>(() => this.createUrenDropdownItems());
    selectedUrenDropdownItem = computed<DropdownItem<TijdOptieUren> | undefined>(() => {
        const selected = this.mode() === 'Begin' ? this.beginTijdUren() : this.eindTijdUren();
        return this.urenDropdownItems().find((item) => item.data.uren === selected?.uren);
    });
    weekOpties = computed(() =>
        createWeekOpties({
            startDate: this.weekOptiesFromDate(),
            now: this.fromDate(),
            rangeStart: this.mode() === 'Eind' ? this.beginDate() : undefined,
            selected: this.mode() === 'Begin' ? this.beginDate() : this.eindDate(),
            showWeken: this.weekOptiesShowTotalWeken()
        })
    );

    private beginDate = computed(() => this.beginDag()?.date);
    private eindDate = computed(() => this.eindDag()?.date);
    private weekOptiesShowTotalWeken = signal<number>(WeekOptiesShowWeken);
    private weekOptiesFromDate = computed<Date>(() => {
        const beginDate = this.beginDate();
        return this.mode() === 'Eind' && beginDate ? beginDate : this.fromDate();
    });

    ngOnInit(): void {
        this.initializeWeekOpties();
        this.initializeDagOpties();
        this.initializeTijdOpties();

        this.beginDag.subscribe(() => this.checkAndCorrectEindDag());
        this.beginTijdUren.subscribe(() => this.checkAndCorrectEindTijd());
        this.beginTijdMinuten.subscribe(() => this.checkAndCorrectEindTijd());
        this.eindDag.subscribe(() => this.checkAndCorrectEindTijd());
        this.eindTijdUren.subscribe(() => this.checkAndCorrectEindTijd());
    }

    selectDagOptie(dagOptie: DagOptie) {
        if (dagOptie.disabled) {
            return;
        }

        if (this.mode() === 'Begin') {
            this.beginDag.set(dagOptie);
        } else if (this.mode() === 'Eind') {
            if (!this.eindDag() || this.eindDatumVerplicht()) {
                this.eindDag.set(dagOptie);
            } else if (!this.eindDatumVerplicht()) {
                const eindDate = this.eindDate();

                // einddatum is niet verplicht, dus die kan worden gedeselecteerd als dezelfde dag wordt gekozen
                if (isEqual(eindDate, dagOptie.date)) {
                    this.eindDag.set(undefined);
                } else {
                    this.eindDag.set(dagOptie);
                }
            }
        }
    }

    selectTijdOptieMinuten(tijdOptieMinuten: TijdOptieMinuten) {
        if (this.mode() === 'Begin') {
            this.beginTijdMinuten.set(tijdOptieMinuten);
        } else {
            this.eindTijdMinuten.set(tijdOptieMinuten);
        }
    }

    selectTijdOptieUren(tijdOptieUren: TijdOptieUren) {
        if (this.mode() === 'Begin') {
            this.beginTijdUren.set(tijdOptieUren);
        } else {
            this.eindTijdUren.set(tijdOptieUren);
        }
    }

    toonMeerWeekOpties() {
        this.weekOptiesShowTotalWeken.update((totalWeken) => totalWeken + WeekOptiesShowWeken);
    }

    private checkAndCorrectEindDag(): void {
        const beginDate = this.beginDate();
        const eindDate = this.eindDate();

        // als er al een einddatum is die ligt voor de begindatum, stel dan de einddatum in op de begindatum
        if (beginDate && eindDate && isBefore(eindDate, beginDate)) {
            this.eindDag.set(this.beginDag());
        }

        this.checkAndCorrectEindTijd();
    }

    private checkAndCorrectEindTijd(): void {
        const beginDate = this.beginDate();
        const eindDate = this.eindDate();

        if (beginDate && eindDate && !isSameDay(beginDate, eindDate)) {
            return;
        }

        const beginTijdUren = this.beginTijdUren()?.uren;
        const beginTijdMinuten = this.beginTijdMinuten()?.minuten;
        const eindTijdUren = this.eindTijdUren()?.uren;
        const eindTijdMinuten = this.eindTijdMinuten()?.minuten;

        if (!isPresent(beginTijdUren) || !isPresent(beginTijdMinuten) || !isPresent(eindTijdUren) || !isPresent(eindTijdMinuten)) {
            return;
        }

        if (eindTijdUren < beginTijdUren) {
            this.eindTijdUren.set(this.beginTijdUren());
            this.eindTijdMinuten.set(this.beginTijdMinuten());
        } else if (eindTijdMinuten < beginTijdMinuten) {
            this.eindTijdMinuten.set(this.beginTijdMinuten());
        }
    }

    private createMinutenDropdownItems(): DropdownItem<TijdOptieMinuten>[] {
        let minutenOptiesDisabledBefore: number | undefined = undefined;
        if (this.mode() === 'Eind') {
            const beginDate = this.beginDate();
            const eindDate = this.eindDate();

            if (beginDate && eindDate && isSameDay(beginDate, eindDate)) {
                const beginTijdUren = this.beginTijdUren()?.uren;
                const eindTijdUren = this.eindTijdUren()?.uren;

                // begin en eind zelfde dag én uren: disable eind tijd minuten opties vóór begin tijd minuten
                if (isPresent(beginTijdUren) && isPresent(eindTijdUren) && beginTijdUren === eindTijdUren) {
                    minutenOptiesDisabledBefore = this.beginTijdMinuten()?.minuten;
                }
            }
        }
        return createTijdOptiesMinuten(minutenOptiesDisabledBefore).map(this.tijdOptieToDropdownItem);
    }

    private createUrenDropdownItems(): DropdownItem<TijdOptieUren>[] {
        let urenOptiesDisabledBefore: number | undefined = undefined;
        if (this.mode() === 'Eind') {
            const beginDate = this.beginDate();
            const eindDate = this.eindDate();

            // begin en eind zelfde dag: disable eind tijd uren opties vóór begin tijd uren
            if (beginDate && eindDate && isSameDay(beginDate, eindDate)) {
                urenOptiesDisabledBefore = this.beginTijdUren()?.uren;
            }
        }
        return createTijdOptiesUren(urenOptiesDisabledBefore).map(this.tijdOptieToDropdownItem);
    }

    private initializeDagOpties() {
        if (this.mode() === 'Begin' && !this.beginDag()) {
            const firstValidDagOptie = first(this.weekOpties())?.dagOpties.find((dagOptie) => !dagOptie.disabled);
            this.beginDag.set(firstValidDagOptie);
        }
        if (this.mode() === 'Eind' && !this.eindDag() && this.eindDatumVerplicht()) {
            this.eindDag.set(this.beginDag());
        }
    }

    private initializeTijdOpties() {
        // mag geen tijstip kiezen, dus geen default tijden instellen
        if (!this.magTijdstipKiezen()) {
            return;
        }

        if (!this.beginTijdUren() || !this.beginTijdMinuten()) {
            this.beginTijdUren.set(first(this.urenDropdownItems())?.data);
            this.beginTijdMinuten.set(first(this.minutenDropdownItems())?.data);
        }
        if (!this.eindTijdUren() || !this.eindTijdMinuten()) {
            this.eindTijdUren.set(last(this.urenDropdownItems())?.data);
            this.eindTijdMinuten.set(last(this.minutenDropdownItems())?.data);
        }
    }

    /**
     * We tonen standaard 2 weken met dag opties, waarbij je de "toon meer" knop kan gebruiken om meer weken te tonen.
     * Als er echter eerder een begin- of einddatum is geselecteerd die buiten die 2 weken ligt, dan moeten we bij
     * het initialiseren van het component berekenen hoeveel weken er in totaal getoond moeten worden.
     */
    private initializeWeekOpties() {
        const beginDate = this.beginDate();
        const eindDate = this.eindDate();
        let totalWekenStart: Date | undefined = undefined;

        if (this.mode() === 'Begin' && beginDate) {
            totalWekenStart = beginDate;
        } else if (this.mode() === 'Eind' && eindDate) {
            totalWekenStart = eindDate;
        }

        if (totalWekenStart) {
            // vergelijk met zondag bij weken berekening
            const diffFrom = previousSunday(this.weekOptiesFromDate());
            let totalWekenDiff = differenceInWeeks(totalWekenStart, diffFrom) + 1;

            if (totalWekenDiff % WeekOptiesShowWeken !== 0) {
                totalWekenDiff = Math.ceil(totalWekenDiff / WeekOptiesShowWeken) * WeekOptiesShowWeken;
            }
            if (totalWekenDiff > WeekOptiesShowWeken) {
                const showTotalWeken = Math.max(totalWekenDiff, WeekOptiesShowWeken);
                this.weekOptiesShowTotalWeken.set(showTotalWeken);
            }
        }
    }

    private tijdOptieToDropdownItem<TijdOptie extends TijdOptieUren | TijdOptieMinuten>(tijdOptie: TijdOptie): DropdownItem<TijdOptie> {
        return { data: tijdOptie, label: tijdOptie.text, disabled: tijdOptie.disabled };
    }
}

type DatumSelectieMode = 'Begin' | 'Eind';

const WeekOptiesShowWeken = 2;
