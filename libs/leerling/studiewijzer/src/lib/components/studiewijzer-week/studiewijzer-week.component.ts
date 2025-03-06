import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    QueryList,
    ViewChild,
    ViewChildren,
    computed,
    inject,
    input,
    output
} from '@angular/core';
import { ButtonComponent, SpinnerComponent } from 'harmony';
import { sorteerStudiewijzerItems } from 'leerling-studiewijzer-api';
import { SlDatePipe } from 'leerling-util';
import { derivedAsync } from 'ngxtension/derived-async';
import { StudiewijzerWeek } from '../../services/studiewijzer-model';
import { StudiewijzerService } from '../../services/studiewijzer.service';
import { SelectedFilters, filterStudiewijzerItems } from '../filter/filter';
import { StudiewijzerDagComponent } from '../studiewijzer-dag/studiewijzer-dag.component';
import { StudiewijzerItemsComponent } from '../studiewijzer-items/studiewijzer-items.component';

@Component({
    selector: 'sl-studiewijzer-week',
    imports: [CommonModule, StudiewijzerDagComponent, SpinnerComponent, StudiewijzerItemsComponent, ButtonComponent],
    templateUrl: './studiewijzer-week.component.html',
    styleUrl: './studiewijzer-week.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerWeekComponent {
    private _studiewijzerService = inject(StudiewijzerService);
    public elementRef = inject(ElementRef);
    private _datePipe = new SlDatePipe();

    @ViewChild('weekHeader', { read: ElementRef, static: true }) weekHeader: ElementRef;
    @ViewChildren(StudiewijzerDagComponent) dagenComponents: QueryList<StudiewijzerDagComponent>;

    week = input.required<StudiewijzerWeek>();
    toonWeekend = input.required<boolean>();
    activeFilters = input<SelectedFilters>({ swiType: [], vak: [] });

    public toonSpinner = computed(() => (this._weekitems() === undefined ? true : false));
    public dagen = computed(() => (this.toonWeekend() ? this.week().dagen : this.week().dagen.filter((dag) => !dag.isWeekendDag)));
    public startDagEindDagTekst = computed(() => {
        const datum = this.week().dagen.filter((dag) => !dag.isWeekendDag)[0];
        return datum ? this._datePipe.transform(datum.datum, 'week_begin_dag_tm_eind_dag_maand_kort') : '';
    });
    public weekTakenAriaLabel = computed(() => {
        const datum = this.week().dagen.filter((dag) => !dag.isWeekendDag)[0];
        return datum ? `Weektaken: ${this._datePipe.transform(datum.datum, 'week_begin_dag_totenmet_eind_dag_maand_lang')}` : '';
    });

    public toonAfvinkKnop = this._studiewijzerService.isAfvinkenToegestaan();

    private _weekitems = derivedAsync(() => this._studiewijzerService.getWeekItems(this.week().dagen[0].datum));
    private _filteredWeekitems = computed(() => this._weekitems()?.filter((item) => filterStudiewijzerItems(item, this.activeFilters())));
    public weekitems = computed(() => sorteerStudiewijzerItems(this._filteredWeekitems() ?? []));

    public terugNaarBoven = output<void>();
}
