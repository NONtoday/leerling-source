import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnInit,
    ViewChild,
    ViewContainerRef,
    computed,
    effect,
    inject,
    signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
    addDays,
    addWeeks,
    endOfWeek,
    format,
    getMonth,
    isFriday,
    isMonday,
    isSameDay,
    isSaturday,
    isWeekend,
    parse,
    startOfToday,
    startOfWeek
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { DeviceService, SpinnerComponent } from 'harmony';
import { IconChevronLinks, IconChevronRechts, provideIcons } from 'harmony-icons';
import { TabBarComponent } from 'leerling-base';
import { REloRestricties } from 'leerling-codegen';
import { HeaderActionButtonComponent, HeaderComponent, ScrollableTitleComponent } from 'leerling-header';
import { StudiemateriaalVakselectieComponent } from 'leerling-studiemateriaal';
import {
    DagenHeaderComponent,
    HorizontalSwipeDirective,
    KeyPressedService,
    OverlayService,
    SidebarService,
    onRefreshOrRedirectHome
} from 'leerling-util';
import { SStudiewijzerItem, VakkeuzeService, isDayInCurrentSchoolyear, valtBinnenHuidigeSchooljaar } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { Observable, combineLatest, map, of, tap } from 'rxjs';
import { StudiewijzerService } from '../../services/studiewijzer.service';
import { SelectedFilters, filterStudiewijzerItems } from '../filter/filter';
import { StudiewijzerDagComponent } from '../studiewijzer-dag/studiewijzer-dag.component';
import { StudiewijzerFilterDropdownComponent } from '../studiewijzer-filter-dropdown/studiewijzer-filter-dropdown.component';
import { StudiewijzerWekenHeaderComponent } from '../studiewijzer-weken-header/studiewijzer-weken-header.component';
import { StudiewijzerWekenComponent } from '../studiewijzer-weken/studiewijzer-weken.component';

export const PEILDATUM_PARAM = 'peildatum';
export const vandaag = startOfToday();
const DATUM_FORMAT = 'yyyy-MM-dd';

@Component({
    selector: 'sl-studiewijzer',
    standalone: true,
    imports: [
        CommonModule,
        SpinnerComponent,
        StudiewijzerWekenHeaderComponent,
        StudiewijzerWekenComponent,
        StudiewijzerDagComponent,
        ScrollableTitleComponent,
        HorizontalSwipeDirective,
        DagenHeaderComponent,
        SpinnerComponent,
        HeaderComponent,
        HeaderActionButtonComponent,
        TabBarComponent
    ],
    templateUrl: './studiewijzer.component.html',
    styleUrl: './studiewijzer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronLinks, IconChevronRechts)]
})
export class StudiewijzerComponent implements OnInit {
    public static HUISWERKFEATURE: keyof REloRestricties = 'huiswerkBekijkenAan';

    @ViewChild(StudiewijzerWekenHeaderComponent, { static: false }) wekenHeader: StudiewijzerWekenHeaderComponent;
    @ViewChild(StudiewijzerWekenComponent, { static: false }) weken: StudiewijzerWekenComponent;
    @ViewChild(DagenHeaderComponent, { static: false }) dagenHeader: DagenHeaderComponent | undefined;

    private _deviceService = inject(DeviceService);
    private _studiewijzerService = inject(StudiewijzerService);
    private _vakkeuzeService = inject(VakkeuzeService);
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _keyPressedService = inject(KeyPressedService);
    private _overlayService = inject(OverlayService);
    private _router = inject(Router);
    private _sidebarService = inject(SidebarService);
    public viewContainerRef = inject(ViewContainerRef);

    private _lastRefreshed = new Date();

    public toonWeekend = signal(false);
    public isTabletOfDesktop = toSignal(this._deviceService.isTabletOrDesktop$, { initialValue: this._deviceService.isTabletOrDesktop() });
    public scrollableTitle$: Observable<string | undefined> = this._studiewijzerService.scrollableTitle$;
    public vakkeuzes = derivedAsync(() => (this.isTabletOfDesktop() ? this._vakkeuzeService.getVakkeuzes() : of([])));
    public activeFilters = signal<SelectedFilters>({ swiType: [], vak: [] });
    public weekEnDagItems = derivedAsync(() => this.getStudiewijzerItemsVoorDrieWeken(this.peildatum(), this.activeFilters()));
    public headerActionFilterCounter = computed(() => this.activeFilters().swiType.length + this.activeFilters().vak.length);

    public paramDatumString = injectQueryParams(PEILDATUM_PARAM);

    public queryPeildatum = computed(() => {
        const param = this.paramDatumString();
        let datum = param ? parse(param, DATUM_FORMAT, new Date()) : new Date();
        if (!isDayInCurrentSchoolyear(datum)) datum = new Date();
        return this.getWeekdagOfMaandag(datum);
    });
    public peildatum = signal(new Date());
    public studiewijzerDag = computed(() => this._studiewijzerService.getDag(this.peildatum()));
    public maandnummer = signal(getMonth(this.peildatum()));

    public vorigeWeekNavigatieMogelijk = computed(() => {
        return isDayInCurrentSchoolyear(endOfWeek(addWeeks(this.peildatum(), -1)));
    });
    public volgendeWeekNavigatieMogelijk = computed(() => {
        return isDayInCurrentSchoolyear(startOfWeek(addWeeks(this.peildatum(), 1)));
    });

    constructor() {
        effect(
            () => {
                this.updateScrollableTitle(this.peildatum());
                this._studiewijzerService.refreshStudiewijzerVoorPeildatum(this.peildatum());
                this.maandnummer.set(getMonth(this.peildatum()));
                this.peildatum.set(this.queryPeildatum());
            },
            {
                allowSignalWrites: true
            }
        );

        this._keyPressedService.mainKeyboardEvent$.pipe(takeUntilDestroyed()).subscribe((event) => this.onKeyDown(event));

        onRefreshOrRedirectHome([StudiewijzerComponent.HUISWERKFEATURE], () => {
            if (this.isTabletOfDesktop()) {
                this._vakkeuzeService.refreshVakkeuzes();
            }

            if (isSameDay(new Date(), this._lastRefreshed)) {
                this._studiewijzerService.refreshStudiewijzerVoorPeildatum(this.peildatum());
            } else {
                this.updatePeildatumVandaag();
            }
            this._lastRefreshed = new Date();
        });
    }

    public getStudiewijzerItemsVoorDrieWeken(date: Date, filters: SelectedFilters): Observable<SStudiewijzerItem[][]> {
        if (this.isTabletOfDesktop()) return of([] as SStudiewijzerItem[][]);
        const vorigeWeek = this._studiewijzerService.getStudiewijzerWeekEnDagItems(addWeeks(date, -1));
        const huidigeWeek = this._studiewijzerService.getStudiewijzerWeekEnDagItems(date);
        const volgendeWeek = this._studiewijzerService.getStudiewijzerWeekEnDagItems(addWeeks(date, 1));

        return combineLatest([vorigeWeek, huidigeWeek, volgendeWeek]).pipe(
            map((result: SStudiewijzerItem[][]) => {
                return result.map((week) => {
                    return week.filter((item) => filterStudiewijzerItems(item, filters));
                });
            }),
            tap(() => {
                this._changeDetectorRef.detectChanges();
            })
        );
    }

    async ngOnInit() {
        this.toonWeekend.set(await this._studiewijzerService.getToonWeekendPreference());
    }

    public updateScrollableTitle(date: Date) {
        const formatDate = format(date, 'MMMM', { locale: nl });
        this._studiewijzerService.scrollableTitle = formatDate.charAt(0).toUpperCase() + formatDate.slice(1);
    }

    /**
     * Als de peildatum in het weekend valt, wordt de eerstvolgende maandag gekozen.
     */
    private getWeekdagOfMaandag(date: Date) {
        return isWeekend(date) ? (isSaturday(date) ? addDays(date, 2) : addDays(date, 1)) : date;
    }

    public updatePeildatum(date: Date): void {
        if (!valtBinnenHuidigeSchooljaar(date)) return;
        this._router.navigate([], {
            queryParams: { [PEILDATUM_PARAM]: format(date, DATUM_FORMAT) },
            queryParamsHandling: 'merge'
        });
    }

    public updatePeildatumVandaag() {
        this.updatePeildatum(new Date());
    }

    public openStudiemateriaalVakselectie() {
        this._sidebarService.push(StudiemateriaalVakselectieComponent, {}, StudiemateriaalVakselectieComponent.getSidebarSettings());
    }

    public focusOnHeader() {
        this.wekenHeader?.previousButton.nativeElement.focus();
    }

    public focusHuidigeWeek() {
        const week = this.weken?.getWeekVoorDatum(new Date());
        week?.weekHeader.nativeElement.focus();
    }

    public onSwipe(next: boolean) {
        const fridayIndex = isFriday(this.peildatum()) ? 3 : 1;
        const mondayIndex = isMonday(this.peildatum()) ? -3 : -1;
        const potentialNewPeildatum = addDays(this.peildatum(), next ? fridayIndex : mondayIndex);
        if (isDayInCurrentSchoolyear(potentialNewPeildatum)) {
            this.updatePeildatum(potentialNewPeildatum);
            window.scrollTo({
                top: 0,
                behavior: 'auto'
            });
        }
    }

    public onKeyDown(event: KeyboardEvent) {
        if (!this.isTabletOfDesktop()) {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                event.stopPropagation();
                this.onSwipe(false);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                event.stopPropagation();
                this.onSwipe(true);
            }
        }
    }

    public openToast() {
        const toast = this._overlayService.popupOrModal(
            StudiewijzerFilterDropdownComponent,
            {
                vakkeuzes: this.vakkeuzes(),
                activeFilters: this.activeFilters()
            },
            StudiewijzerFilterDropdownComponent.getPopupSettings(304),
            StudiewijzerFilterDropdownComponent.getModalSettings(),
            this.viewContainerRef
        );

        toast.filters.subscribe((value) => {
            this.activeFilters.set(value);
        });
    }

    public horizontalNext() {
        this.updatePeildatum(addDays(this.peildatum(), 1));
    }

    public horizontalPrevious() {
        this.updatePeildatum(addDays(this.peildatum(), -1));
    }

    public changeMaandnummer(newMaandnummer: number): void {
        this.maandnummer.set(newMaandnummer);
    }

    public toggleWeekendBekijken(value: boolean) {
        this.toonWeekend.set(value);
        this._studiewijzerService.updateToonWeekendPreference(value);
    }

    public scrollNaarBepaaldeWeek(date: Date, focusOnKeyboardAccess = false) {
        this.weken?.scrollToDatum(date, 'smooth', focusOnKeyboardAccess);
    }

    public refreshStudiewijzer(date: Date) {
        this._studiewijzerService.refreshStudiewijzer(date);
        this.peildatum.set(date);
    }
}
