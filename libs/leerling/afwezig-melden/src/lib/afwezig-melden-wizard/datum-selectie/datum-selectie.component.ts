import { ChangeDetectionStrategy, Component, OnInit, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { differenceInWeeks, isAfter, isBefore, isSameDay, previousSunday } from 'date-fns';
import { DropdownComponent, DropdownItem, IconDirective, ToggleComponent } from 'harmony';
import { IconChevronOnder, provideIcons } from 'harmony-icons';
import { formatDateNL } from 'leerling-util';
import { DagOptie, TijdOptie, createInitialSelectedTijdOptie, createTijdOpties, createWeekOpties } from '../afwezig-melden-model';

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
    beginDag = model<DagOptie>();
    beginTijd = model<TijdOptie>();
    eindDag = model<DagOptie>();
    eindTijd = model<TijdOptie>();
    heleDag = model<boolean>(true);

    fromDate = input(new Date()); // niet verplicht, maakt testen makkelijker
    magTijdstipKiezen = input.required<boolean>();
    mode = input.required<DatePickerMode>();

    selectedTijdOptieDropdownItem = model<DropdownItem<TijdOptie>>();
    tijdOptieDropdownItems = computed<DropdownItem<TijdOptie>[]>(() => this.createTijdOptieDropdownItems());
    weekOpties = computed(() => createWeekOpties(this.weekOptiesFromDate(), this.weekOptiesShowTotalWeken(), this.fromDate()));
    weekOptiesFromDate = computed<Date>(() => {
        const beginDate = this.beginDate();
        return this.mode() === 'Eind' && beginDate ? beginDate : this.fromDate();
    });
    weekOptiesShowTotalWeken = signal<number>(WeekOptiesShowWeken);

    private beginDate = computed(() => this.beginDag()?.date);
    private eindDate = computed(() => this.eindDag()?.date);

    constructor() {
        this.heleDag.subscribe((heleDag) => this.onHeleDagChange(heleDag));
        this.beginTijd.subscribe(() => this.onBeginTijdChange());
        this.eindDag.subscribe(() => this.onEindDagChange());
    }

    ngOnInit(): void {
        this.initializeTijdSelectie();
        this.setShowTotalWeken();
    }

    dagOptieAriaLabel(dagOptie: DagOptie): string {
        let label = formatDateNL(dagOptie.date, 'dag_uitgeschreven_dagnummer_maand');
        if (this.isSelectedDagOptie(dagOptie)) {
            label += ' is geselecteerd';
        } else if (dagOptie.disabled) {
            label += ' niet selecteerbaar';
        }
        return label;
    }

    /**
     * Bij het selecteren van de einddatum: markeer dagen vanaf de begindatum en tot de einddatum.
     */
    isBeginEindRangeOptie({ date }: DagOptie): boolean {
        if (this.mode() === 'Begin') {
            return false;
        }

        const beginDate = this.beginDate();
        const eindDate = this.eindDate();

        if (!beginDate || !eindDate) {
            return false;
        }

        // de geselecteerde einddatum is dezelfde dag als de begindatum
        if (isSameDay(eindDate, beginDate)) {
            return false;
        }

        // de datum is gelijk aan de begindatum, of zit tussen de begin- en einddatum
        return isSameDay(date, beginDate) || (isAfter(date, beginDate) && isBefore(date, eindDate));
    }

    isSelectedDagOptie({ date }: DagOptie): boolean {
        const beginDate = this.beginDate();
        const eindDate = this.eindDate();

        if (this.mode() === 'Begin' && beginDate) {
            return isSameDay(beginDate, date);
        } else if (this.mode() === 'Eind' && eindDate) {
            return isSameDay(eindDate, date);
        }
        return false;
    }

    onTijdOptieSelected(selected: TijdOptie) {
        if (this.mode() === 'Begin') {
            this.beginTijd.set(selected);
        } else {
            this.eindTijd.set(selected);
        }
    }

    tijdSelectieAriaLabel(): string {
        let label = '';
        if (this.mode() === 'Begin' && this.beginTijd()) {
            label += this.beginTijd()?.text;
        } else if (this.mode() === 'Eind' && this.eindTijd()) {
            label += this.eindTijd()?.text;
        }
        if (label.length === 0) {
            return 'selecteer tijd';
        }
        label += ' is geselecteerd';
        return label;
    }

    toggleHeleDag($event: MouseEvent) {
        const { classList } = $event.target as HTMLElement;

        // moet kunnen klikken op container om de toggle te triggeren
        if (HeleDagToggleClassNames.some((className) => classList.contains(className))) {
            this.heleDag.set(!this.heleDag());
        }
    }

    toonMeerWeekOpties() {
        this.weekOptiesShowTotalWeken.update((totalWeken) => totalWeken + WeekOptiesShowWeken);
    }

    selectDagOptie(dagOptie: DagOptie) {
        if (dagOptie.disabled) {
            return;
        }

        // sla huidige "hele dag" selectie op bij gekozen dag optie
        dagOptie.heleDag = this.heleDag();

        if (this.mode() === 'Begin') {
            this.beginDag.set(dagOptie);

            // reset de einddatum als een nieuwe begindatum wordt geselecteerd
            this.eindDag.set(undefined);
        } else if (this.mode() === 'Eind') {
            this.eindDag.set(dagOptie);
        }
    }

    private createTijdOptieDropdownItems(): DropdownItem<TijdOptie>[] {
        const beginDate = this.beginDate();
        const beginTijd = this.beginTijd();
        const eindDate = this.eindDate();
        let disabledBefore: TijdOptie | undefined = undefined;

        // disable tijdopties voor de begintijd als de begindatum hetzelfde is als de einddatum
        if (this.mode() === 'Eind' && beginTijd && beginDate && eindDate && isSameDay(beginDate, eindDate)) {
            disabledBefore = beginTijd;
        }

        return createTijdOpties(disabledBefore).map((tijdOptie) => ({
            label: tijdOptie.text,
            data: tijdOptie,
            disabled: tijdOptie.disabled
        }));
    }

    private initializeTijdSelectie() {
        const beginDag = this.beginDag();
        const eindDag = this.eindDag();

        if (this.mode() === 'Begin') {
            if (beginDag) {
                this.heleDag.set(beginDag.heleDag);
            } else if (this.beginTijd()) {
                this.heleDag.set(false);
            }
        } else if (this.mode() === 'Eind') {
            if (eindDag) {
                this.heleDag.set(eindDag.heleDag);
            } else if (this.eindTijd()) {
                this.heleDag.set(false);
            }
        }
    }

    private onBeginTijdChange() {
        const beginDate = this.beginDate();
        const beginTijd = this.beginTijd();
        const eindDate = this.eindDate();
        const eindTijd = this.eindTijd();

        if (!beginDate || !beginTijd || !eindTijd) {
            return;
        }

        // de eerder ingestelde eindtijd is voor de gekozen begintijd, dus verwijder de eindtijd ("hele dag")
        if ((!eindDate || isSameDay(beginDate, eindDate)) && eindTijd.numericValue < beginTijd.numericValue) {
            this.eindDag.update((dagOptie) => applyWhenPresent(dagOptie, (present) => (present.heleDag = true)));
            this.eindTijd.set(undefined);
        }
    }

    private onEindDagChange(): void {
        const beginDate = this.beginDate();
        const beginTijd = this.beginTijd();
        const eindDate = this.eindDate();
        const eindTijd = this.eindTijd();

        if (!beginDate || !beginTijd || !eindTijd) {
            return;
        }

        // de eerder ingestelde eindtijd is voor de gekozen begintijd, dus stel de eindtijd in op de begintijd
        if ((!eindDate || isSameDay(beginDate, eindDate)) && eindTijd.numericValue < beginTijd.numericValue) {
            this.eindTijd.set(beginTijd);
        }
    }

    private onHeleDagChange(heleDag: boolean) {
        let selectedTijdOptie: TijdOptie | undefined = undefined;

        if (this.mode() === 'Begin') {
            this.beginDag.update((dagOptie) => applyWhenPresent(dagOptie, (present) => (present.heleDag = heleDag)));

            this.beginTijd.update((beginTijd) => {
                if (heleDag) return undefined;
                if (beginTijd) return beginTijd;

                // initialiseer met tijd optie die dichtst bij huidige tijd zit
                return createInitialSelectedTijdOptie(this.fromDate());
            });

            if (!heleDag) {
                selectedTijdOptie = this.beginTijd();
            }
        } else if (this.mode() === 'Eind') {
            this.eindDag.update((dagOptie) => applyWhenPresent(dagOptie, (present) => (present.heleDag = heleDag)));

            this.eindTijd.update((eindTijd) => {
                if (heleDag) return undefined;
                if (eindTijd) return eindTijd;

                // initialiseer met begintijd of tijd optie die dichtst bij huidige tijd zit
                return this.beginTijd() || createInitialSelectedTijdOptie(this.fromDate());
            });

            if (!heleDag) {
                selectedTijdOptie = this.eindTijd();
            }
        }

        if (selectedTijdOptie) {
            const selectedDropdownItem = this.tijdOptieDropdownItems().find(
                (item) => item.data.numericValue === selectedTijdOptie.numericValue
            );
            if (selectedDropdownItem) {
                this.selectedTijdOptieDropdownItem.set(selectedDropdownItem);
            } else {
                console.error(`Kon de initieel geselecteerde tijdoptie niet bepalen`);
            }
        }
    }

    /**
     * We tonen standaard 2 weken met dag opties, waarbij je de "toon meer" knop kan gebruiken om meer weken te tonen.
     * Als er echter eerder een begin- of einddatum is geselecteerd die buiten die 2 weken ligt, dan moeten we bij
     * het initialiseren van het component berekenen hoeveel weken er in totaal getoond moeten worden.
     */
    private setShowTotalWeken() {
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
}

type DatePickerMode = 'Begin' | 'Eind';

const HeleDagToggleClassNames = ['hele-dag-toggle', 'hele-dag-toggle-text', 'tijd-selectie-container'];
const WeekOptiesShowWeken = 2;

function applyWhenPresent<T>(optional: T | undefined, apply: (present: T) => void): T | undefined {
    if (optional !== undefined) {
        apply(optional);
    }
    return optional;
}
