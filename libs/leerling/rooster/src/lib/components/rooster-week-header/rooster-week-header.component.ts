import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnChanges,
    QueryList,
    SimpleChanges,
    ViewChildren,
    computed,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import { addDays, format, getISOWeek, isSameDay, isToday, startOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ButtonComponent, IconDirective, TooltipDirective, isPresent } from 'harmony';
import { IconChevronLinks, IconChevronRechts, IconDownloaden, IconKalenderDag, provideIcons } from 'harmony-icons';
import { AccessibilityService, Direction } from 'leerling-util';
import { RechtenService } from 'leerling/store';
import { range, upperFirst } from 'lodash-es';
import { derivedAsync } from 'ngxtension/derived-async';
import { Observable, filter, map, startWith } from 'rxjs';
import { RoosterViewModel } from '../../services/rooster-model';
import { RoosterService } from '../../services/rooster.service';
import { pluralMapping } from '../util/rooster-huiswerk-stack/plural-mapping';
import { RoosterHuiswerkStackComponent } from '../util/rooster-huiswerk-stack/rooster-huiswerk-stack.component';
import { RoosterMaatregelenComponent } from '../util/rooster-maatregelen/rooster-maatregelen.component';

export type WeekDateTab = {
    datum: Date;
    dagNaam: string;
    dagnummer: string;
    description: string;
    isActive: boolean;
};

export type DirectionOfVandaag = Direction | 'vandaag';

@Component({
    selector: 'sl-rooster-week-header',
    standalone: true,
    imports: [CommonModule, IconDirective, TooltipDirective, RoosterHuiswerkStackComponent, RoosterMaatregelenComponent, ButtonComponent],
    templateUrl: './rooster-week-header.component.html',
    styleUrls: ['./rooster-week-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconKalenderDag, IconChevronLinks, IconChevronRechts, IconDownloaden)]
})
export class RoosterWeekHeaderComponent implements OnChanges {
    @ViewChildren('dagHeader', { read: ElementRef }) dagHeaders: QueryList<ElementRef>;

    private _roosterService = inject(RoosterService);
    private _accessibilityService = inject(AccessibilityService);
    private _rechtenService = inject(RechtenService);

    public datum = input.required<Date>();
    public toonWeekend = input.required<boolean>();
    public vorigeWeekEnabled = input.required<boolean>();
    public volgendeWeekEnabled = input.required<boolean>();

    public weekend = output<boolean>();
    public navigation = output<DirectionOfVandaag>();

    public toonWeekendButton = signal(false);
    public weekendButtonText = computed(() => (this.toonWeekend() ? 'Verberg weekend' : 'Toon weekend'));
    public weekendToonVerbergKnopTabIndex = 151;

    public huidigeWeek: number;
    public huidigeMaand: string;
    public dates: WeekDateTab[];
    public weekRooster$: Observable<RoosterViewModel>;
    public pluralMapping = pluralMapping;

    public showStacks$: Observable<boolean>;
    public stacksRows$: Observable<string>;

    public heeftMaatregelRechten = derivedAsync(() =>
        this._rechtenService
            .getCurrentAccountRechten()
            .pipe(map((rechten) => rechten.absentiesBekijkenAan && rechten.absentieMaatregelBekijkenAan))
    );

    constructor() {
        if (this.heeftMaatregelRechten()) {
            this._roosterService.refreshMaatregelen();
        }
    }

    public ngOnChanges(simpleChanges: SimpleChanges): void {
        const previousValue = simpleChanges['datum']?.previousValue;
        const datumChanged = !isSameDay(previousValue, this.datum());
        const toonWeekendChanged = simpleChanges['toonWeekend']?.previousValue !== this.toonWeekend;
        if (datumChanged || toonWeekendChanged) {
            this.updateDates();
            this.huidigeWeek = getISOWeek(this.datum());
            this.huidigeMaand = this.getMaand();
        }

        this.weekRooster$ = this._roosterService
            .getRooster(this.dates[0].datum, this.dates[this.dates.length - 1].datum, this.heeftMaatregelRechten() ?? false)
            .pipe(
                filter(isPresent),
                startWith({
                    weekitems: [],
                    dagen: Array(this.dates.length).fill({
                        datum: this.datum,
                        dagitems: [],
                        afspraken: [],
                        maatregelen: []
                    })
                })
            );

        this.showStacks$ = this.weekRooster$.pipe(
            map((rooster) => rooster.dagen.some((dag) => dag.dagitems.length != 0 || dag.maatregelen.length != 0))
        );
        this.stacksRows$ = this.weekRooster$.pipe(
            map((rooster) => {
                const heeftTaken = rooster.dagen.some((dag) => dag.dagitems.length != 0) || rooster.weekitems.length != 0;
                const heeftMaatregelen = rooster.dagen.some((dag) => dag.maatregelen.length != 0);

                return `${heeftTaken ? '40px' : '0'} ${heeftMaatregelen ? '40px' : '0'}`;
            })
        );
    }

    public toggleWeekend(): void {
        this.weekend.emit(!this.toonWeekend());

        setTimeout(() => {
            if (this._accessibilityService.isAccessedByKeyboard()) {
                this._accessibilityService.focusElementWithTabIndex(this.weekendToonVerbergKnopTabIndex);
            }
        });
    }

    private getMaand(): string {
        const maandag = startOfWeek(this.datum(), { weekStartsOn: 1 });
        const aantalDagen = this.toonWeekend() ? 6 : 4;

        return upperFirst(format(addDays(maandag, aantalDagen), 'MMMM', { locale: nl }));
    }

    private updateDates(): WeekDateTab[] {
        const maandag = startOfWeek(this.datum(), { weekStartsOn: 1 });
        const aantalDagen = this.toonWeekend() ? 7 : 5;
        return (this.dates = [
            {
                datum: maandag,
                dagNaam: this.getDagnaam(maandag),
                dagnummer: this.getDagnummer(maandag),
                description: format(maandag, 'EEEE d-MMMM', { locale: nl }),
                isActive: isToday(maandag)
            },
            ...range(1, aantalDagen).map((index) => {
                const dag = addDays(maandag, index);
                return {
                    datum: dag,
                    dagNaam: this.getDagnaam(dag),
                    dagnummer: this.getDagnummer(dag),
                    description: format(dag, 'EEEE d-MMMM', { locale: nl }),
                    isActive: isToday(dag)
                };
            })
        ]);
    }
    private getDagnaam(date: Date): string {
        const formattedDate = format(date, 'EEEE', { locale: nl });
        return upperFirst(formattedDate);
    }

    private getDagnummer(date: Date): string {
        return format(date, 'd', { locale: nl });
    }

    public onNavigation(direction: DirectionOfVandaag): void {
        if ((direction === 'next' && !this.volgendeWeekEnabled) || (direction === 'previous' && !this.vorigeWeekEnabled)) return;
        this.navigation.emit(direction);
    }
}
