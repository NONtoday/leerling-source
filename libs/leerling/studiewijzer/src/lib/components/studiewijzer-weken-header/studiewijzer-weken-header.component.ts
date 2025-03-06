import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { addWeeks, endOfWeek, startOfWeek } from 'date-fns';
import { ButtonComponent, IconDirective, TooltipDirective } from 'harmony';
import {
    IconBoek,
    IconChevronBoven,
    IconChevronOnder,
    IconDownloaden,
    IconFilter,
    IconInleveropdracht,
    IconKalenderDag,
    provideIcons
} from 'harmony-icons';
import { StudiemateriaalVakselectieComponent } from 'leerling-studiemateriaal';

import { Direction, SidebarService } from 'leerling-util';
import { SVakkeuze, isDayInCurrentSchoolyear } from 'leerling/store';
import { SelectedFilters } from '../filter/filter';
import { InleveringenListComponent } from '../inleveropdrachten/inleveringen-list/inleveringen-list.component';
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

export type DirectionOfVandaag = Direction | 'vandaag';

@Component({
    selector: 'sl-studiewijzer-weken-header',
    imports: [CommonModule, TooltipDirective, IconDirective, StudiewijzerFilterButtonComponent, ButtonComponent],
    templateUrl: './studiewijzer-weken-header.component.html',
    styleUrl: './studiewijzer-weken-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        provideIcons(
            IconDownloaden,
            IconChevronOnder,
            IconKalenderDag,
            IconFilter,
            IconBoek,
            IconChevronOnder,
            IconChevronBoven,
            IconInleveropdracht
        )
    ]
})
export class StudiewijzerWekenHeaderComponent {
    @ViewChild('previous', { read: ElementRef, static: true }) previousButton: ElementRef;

    private _sidebarService = inject(SidebarService);

    datum = input.required<Date>();
    toonWeekend = input.required<boolean>();
    maandnummer = input.required<number>();
    vakkeuzes = input.required<SVakkeuze[]>();

    public weekend = output<boolean>();
    public naarVandaag = output<Date>();
    public naarHuidigeWeek = output<void>();
    public naarBepaaldeWeek = output<Date>();
    public activeFilters = output<SelectedFilters>();

    public maanden = maanden;
    public navigationDate = signal(new Date());
    public dagen = computed(() => (this.toonWeekend() ? headerDagen : headerDagen.filter((dag) => !dag.weekend)));
    public numberSelected = signal(0);
    private _lastNavigated = signal(0);
    public toonWeekendButton = signal(false);
    public weekendButtonText = computed(() => (this.toonWeekend() ? 'Verberg weekend' : 'Toon weekend'));
    public filterButtonText = computed(
        () => `Filter, aantal keuzes: ${this.vakkeuzes().length + 4}, geselecteerd: ${this.numberSelected()}`
    );

    public vorigeWeekEnabled = computed(() => {
        return isDayInCurrentSchoolyear(endOfWeek(addWeeks(this.navigationDate(), -1)));
    });
    public volgendeWeekEnabled = computed(() => {
        return isDayInCurrentSchoolyear(startOfWeek(addWeeks(this.navigationDate(), 1)));
    });

    constructor() {
        effect(() => {
            this.navigationDate.set(this.datum());
        });
    }

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

    public openInleveropdrachten() {
        this._sidebarService.push(InleveringenListComponent, {}, InleveringenListComponent.getSidebarSettings());
    }

    public onNavigation(direction: DirectionOfVandaag): void {
        if (direction === 'vandaag') return this.emitNaarVandaag();

        // Bij inhouden enter-toets niet te veel navigeren
        const now = new Date().getTime();
        if (now - this._lastNavigated() < 400) return;
        this._lastNavigated.set(now);

        const date = addWeeks(this.navigationDate(), direction === 'previous' ? -1 : 1);

        if (('previous' === direction && !this.vorigeWeekEnabled()) || ('next' === direction && !this.volgendeWeekEnabled())) {
            return;
        }

        this.navigationDate.set(date);
        this.naarBepaaldeWeek.emit(this.navigationDate());
    }

    public emitNaarVandaag() {
        this.naarVandaag.emit(new Date());
        this.navigationDate.set(new Date());
    }
}
