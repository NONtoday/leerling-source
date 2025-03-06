import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    output,
    signal,
    viewChild,
    viewChildren
} from '@angular/core';
import { differenceInDays, isSameDay } from 'date-fns';
import { PillComponent, SpinnerComponent } from 'harmony';
import { sorteerStudiewijzerItems } from 'leerling-studiewijzer-api';
import { SlDatePipe } from 'leerling-util';
import { isDayInCurrentSchoolyear } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { StudiewijzerWeek } from '../../services/studiewijzer-model';
import { StudiewijzerService } from '../../services/studiewijzer.service';
import { StudiewijzerItemsComponent } from '../studiewijzer-items/studiewijzer-items.component';
import { StudiewijzerLijstDagComponent } from '../studiewijzer-lijst-dag/studiewijzer-lijst-dag.component';

export const WEEK_HEADER_HOOGTE = 57;

export const WEEK_DIVIDER_HEIGHT = 33;

@Component({
    selector: 'sl-studiewijzer-lijst-week',
    standalone: true,
    imports: [CommonModule, StudiewijzerLijstDagComponent, SpinnerComponent, StudiewijzerItemsComponent, PillComponent],
    templateUrl: './studiewijzer-lijst-week.component.html',
    styleUrls: ['./studiewijzer-lijst-week.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerLijstWeekComponent {
    private _studiewijzerService = inject(StudiewijzerService);
    public elementRef = inject(ElementRef);
    private _datePipe = new SlDatePipe();

    public weekHeader = viewChild.required('weekHeader', { read: ElementRef });
    public weekTaken = viewChild('weekTaken', { read: ElementRef });
    dagenComponents = viewChildren(StudiewijzerLijstDagComponent);

    week = input.required<StudiewijzerWeek>();
    toonWeekend = input.required<boolean>();
    scrollOffset = input.required<number>();
    peildatum = input.required<Date>();
    initialLoadCompleted = input<boolean>();

    scrollNaarWeek = output<StudiewijzerWeek>();

    public headerOffset = computed(() => {
        // De weekheader wordt ook getoond als de items nog niet opgehaald zijn.
        if (!this.weekitems() || this.weekitems().length > 0) {
            return this.scrollOffset() + WEEK_HEADER_HOOGTE;
        }

        return this.scrollOffset();
    });

    // Als de weektaken niet volledig in beeld zijn, willen we een lijntje tekenen in de UI.
    public isEersteWeektaakVolledigInBeeld = signal(false);

    public isWeekCurrentWeek = computed(() => {
        return this.week().dagen.some((dag) => isSameDay(dag.datum, this.peildatum()));
    });

    // Vanuit initiële load renderen we niet gelijk alle weken, maar alles binnen 4 weken van de peildatum.
    public valtBinnen4Weken = computed(() => {
        return Math.abs(differenceInDays(this.week().dagen[0].datum, this.peildatum())) < 28;
    });
    public shouldRender = signal(false);

    public toonSpinner = computed(() => this._weekitemsUnsorted() === undefined);
    public dagen = computed(() => (this.toonWeekend() ? this.week().dagen : this.week().dagen.filter((dag) => !dag.isWeekendDag)));
    public startDagEindDagTekst = computed(() => {
        const datum = this.week().dagen[0];
        return datum ? this._datePipe.transform(datum.datum, 'week_begin_dag_tm_eind_dag_maand_kort') : '';
    });

    public heeftWeektaken = computed(() => {
        const weekitems = this.weekitems();
        return weekitems && weekitems.length > 0;
    });

    public aantalWeektakenLabel = computed(() => {
        const weekitems = this.weekitems();
        if (!weekitems) {
            return '-';
        }

        const afgefinkteWeekitems = weekitems.filter((weekitem) => weekitem.gemaakt).length;
        return afgefinkteWeekitems + '/' + weekitems.length;
    });

    public toonAfvinkKnop = this._studiewijzerService.isAfvinkenToegestaan();

    private _weekitemsUnsorted = derivedAsync(() => this._studiewijzerService.getWeekItems(this.week().dagen[0].datum));
    public weekitems = computed(() => sorteerStudiewijzerItems(this._weekitemsUnsorted() ?? []));

    constructor() {
        // Als een week eenmaal gerenderd is, gaan we hem niet meer 'ontrenderen'
        effect(() => {
            if (this.valtBinnen4Weken()) this.shouldRender.set(true);
        });
    }

    public onWeekitemsStackChanged(stacked: boolean) {
        if (stacked) {
            this.scrollNaarWeek.emit(this.week());
        }
    }

    public getWeekheader(): ElementRef {
        return this.weekHeader();
    }

    // We willen niet voor elke week een scroll-listener (dan zouden we er 52 hebben).
    // We hebben een overkoepelende in de studiewijzer-lijst.component.
    // Als er gescrolld wordt wordt de peilweek via deze functie daarover genotificeerd.
    public peilweekIsScrolled() {
        const weekTaken = this.weekTaken();
        if (!weekTaken || !this.isWeekCurrentWeek()) return;

        const weektakenTop = weekTaken.nativeElement?.getBoundingClientRect().top;
        // 2 extra pixels marge, ziet er mooier uit.
        this.isEersteWeektaakVolledigInBeeld.set(weektakenTop > this.scrollOffset() + WEEK_HEADER_HOOGTE + 2);
    }

    public getBovensteDatumInBeeldInDitSchooljaar(isWeekheaderInBeeld: boolean): Date | undefined {
        const weeknummer = this.week().weeknummer;
        let dagen: StudiewijzerLijstDagComponent[] = this.dagenComponents().slice();

        // 1 augustus valt ofwel in week 30 of in 31
        // We doen eerst een weeknummer check, dat is goedkoper dan altijd de schooljaarcheck.
        if (weeknummer === 30 || weeknummer === 31) {
            // Pak alleen de dagen in dit schooljaar.
            dagen = dagen.filter((dagComponent) => isDayInCurrentSchoolyear(dagComponent.dag().datum));
        }

        const offset = this.scrollOffset() + (isWeekheaderInBeeld ? WEEK_HEADER_HOOGTE : 0);

        // Overlapt de dag met het scherm?
        // Neem 11 pixels minder van de bottom - dan is er eigenlijk toch al niets meer zichtbaar van die dag
        // en ziet het er net wat vloeiender uit.
        const dagComponentsInBeeld = dagen.filter((dagComponent) => {
            const dagBoundingRect = dagComponent.elementRef.nativeElement.getBoundingClientRect();
            return dagBoundingRect.top <= window.innerHeight && offset <= dagBoundingRect.bottom - 11;
        });

        if (dagComponentsInBeeld.length === 0) return undefined;

        return dagComponentsInBeeld[0].dag().datum;
    }
}
