import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { ButtonComponent, IconDirective, TooltipDirective } from 'harmony';
import { IconBoek, IconChevronOnder, IconDownloaden, IconFilter, IconKalenderDag, provideIcons } from 'harmony-icons';
import { StudiemateriaalVakselectieComponent } from 'leerling-studiemateriaal';
import { SidebarService } from 'leerling-util';
import { SVakkeuze } from 'leerling/store';
import { SelectedFilters } from '../filter/filter';
import { StudiewijzerFilterButtonComponent } from '../studiewijzer-filter-button/studiewijzer-filter-button.component';

interface HeaderDag {
    label: string;
    weekend?: boolean;
}

export const maanden = [
    'Januari',
    'Februari',
    'Maart',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Augustus',
    'September',
    'Oktober',
    'November',
    'December'
];

export const headerDagen: HeaderDag[] = [
    { label: ' ' },
    { label: 'Maandag' },
    { label: 'Dinsdag' },
    { label: 'Woensdag' },
    { label: 'Donderdag' },
    { label: 'Vrijdag' },
    { label: 'Zaterdag', weekend: true },
    { label: 'Zondag', weekend: true }
];

@Component({
    selector: 'sl-studiewijzer-weken-header',
    standalone: true,
    imports: [CommonModule, TooltipDirective, IconDirective, StudiewijzerFilterButtonComponent, ButtonComponent],
    templateUrl: './studiewijzer-weken-header.component.html',
    styleUrl: './studiewijzer-weken-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconDownloaden, IconChevronOnder, IconKalenderDag, IconFilter, IconBoek)]
})
export class StudiewijzerWekenHeaderComponent {
    @ViewChild('vandaag', { read: ElementRef, static: true }) vandaagButton: ElementRef;

    private _sidebarService = inject(SidebarService);

    datum = input.required<Date>();
    toonWeekend = input.required<boolean>();
    maandnummer = input.required<number>();
    vakkeuzes = input.required<SVakkeuze[]>();

    public weekend = output<boolean>();
    public naarVandaag = output<void>();
    public naarHuidigeWeek = output<void>();
    public activeFilters = output<SelectedFilters>();

    public maanden = maanden;
    public dagen = computed(() => (this.toonWeekend() ? headerDagen : headerDagen.filter((dag) => !dag.weekend)));
    public numberSelected = signal(0);
    public toonWeekendButton = signal(false);
    public weekendButtonText = computed(() => (this.toonWeekend() ? 'Verberg weekend' : 'Toon weekend'));
    public filterButtonText = computed(
        () => `Filter, aantal keuzes: ${this.vakkeuzes().length + 4}, geselecteerd: ${this.numberSelected()}`
    );

    public toggleWeekend(): void {
        this.weekend.emit(!this.toonWeekend());
    }

    public setNumberSelected(value: SelectedFilters) {
        this.numberSelected.set(value.swiType.length + value.vak.length);
        this.activeFilters.emit(value);
    }

    public openStudiemateriaal() {
        this._sidebarService.push(StudiemateriaalVakselectieComponent, {}, StudiemateriaalVakselectieComponent.getSidebarSettings());
    }
}
