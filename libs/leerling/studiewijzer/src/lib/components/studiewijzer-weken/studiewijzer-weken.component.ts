import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    OnChanges,
    QueryList,
    ViewChildren,
    inject,
    input,
    output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { getISOWeek, getMonth, isSameDay } from 'date-fns';
import { isPresent } from 'harmony';
import { AccessibilityService, onRefresh } from 'leerling-util';
import { filter, fromEvent } from 'rxjs';
import { StudiewijzerWeek } from '../../services/studiewijzer-model';
import { StudiewijzerService } from '../../services/studiewijzer.service';
import { SelectedFilters } from '../filter/filter';
import { StudiewijzerWeekComponent } from '../studiewijzer-week/studiewijzer-week.component';

const SCROLL_OFFSET = 168;

@Component({
    selector: 'sl-studiewijzer-weken',
    standalone: true,
    imports: [CommonModule, StudiewijzerWeekComponent],
    templateUrl: './studiewijzer-weken.component.html',
    styleUrl: './studiewijzer-weken.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerWekenComponent implements OnChanges, AfterViewInit {
    datum = input.required<Date>();
    toonWeekend = input.required<boolean>();
    activeFilters = input<SelectedFilters>({ swiType: [], vak: [] });

    private _accessibilityService = inject(AccessibilityService);

    public maandnummer = output<number>();
    public refreshStudiewijzer = output<Date>();
    public terugNaarBoven = output<void>();

    @ViewChildren(StudiewijzerWeekComponent) weekComponents: QueryList<StudiewijzerWeekComponent>;

    private _studiewijzerService = inject(StudiewijzerService);

    public weken: StudiewijzerWeek[];

    constructor() {
        fromEvent(window, 'scroll')
            .pipe(
                filter(() => isPresent(this.weekComponents)),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                const bovensteVolledigeWeekInBeeld = this.getBovensteVolledigeWeekInBeeld();
                bovensteVolledigeWeekInBeeld && this.maandnummer.emit(this.getMaand(bovensteVolledigeWeekInBeeld.week()));
                this.refreshStudiewijzer.emit(bovensteVolledigeWeekInBeeld?.week().dagen[0].datum ?? new Date());
            });

        onRefresh(() => {
            this.refreshStudiewijzer.emit(this.getBovensteVolledigeWeekInBeeld()?.week().dagen[0].datum ?? new Date());
        });
    }

    private getBovensteVolledigeWeekInBeeld(): StudiewijzerWeekComponent | undefined {
        return this.weekComponents?.find((weekComponent) => {
            const rect = weekComponent.elementRef.nativeElement.getBoundingClientRect();
            return rect.top >= SCROLL_OFFSET;
        });
    }

    ngOnChanges(): void {
        this.refreshStudiewijzer.emit(this.datum());
        this.weken = this._studiewijzerService.vulWeken(this.datum());
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.scrollToDatum(this.datum(), 'auto', false);
        });
    }

    public getMaand(week: StudiewijzerWeek): number {
        // Geef de maand terug van de laatst getoonde datum in de week
        return getMonth(week.dagen[this.toonWeekend() ? 6 : 4].datum);
    }

    public scrollToDatum(datum: Date, behavior: ScrollBehavior, focusOnKeyboardAccess: boolean) {
        const week = this.getWeekVoorDatum(datum);
        if (!week) return;
        if (focusOnKeyboardAccess && this._accessibilityService.isAccessedByKeyboard()) {
            const dag = week.dagenComponents.toArray().find((dag) => isSameDay(datum, dag.dag().datum));
            dag?.dagHeader.nativeElement.focus();
        } else {
            window.scrollTo({
                top: week.elementRef.nativeElement.getBoundingClientRect().top - SCROLL_OFFSET + window.scrollY,
                behavior
            });
        }
    }

    public getWeekVoorDatum(datum: Date): StudiewijzerWeekComponent | undefined {
        const weeknummer = getISOWeek(datum ?? new Date());
        return this.weekComponents.find((week) => week.week().weeknummer === weeknummer);
    }
}
