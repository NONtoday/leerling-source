import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    Signal,
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
import { IconChevronLinks, IconChevronRechts, IconInleveropdracht, provideIcons } from 'harmony-icons';
import { WeergaveService } from 'leerling-account-modal';
import { STUDIEWIJZER, STUDIEWIJZER_PARAMETERS, STUDIEWIJZER_PEILDATUM_DATUMFORMAT, TabBarComponent, getRestriction } from 'leerling-base';
import { HeaderActionButtonComponent, HeaderComponent, HeaderService, ScrollableTitleComponent } from 'leerling-header';
import {
    DagenHeaderComponent,
    GuardableComponent,
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
import { InleveringenListComponent } from '../inleveropdrachten/inleveringen-list/inleveringen-list.component';
import { StudiewijzerDagComponent } from '../studiewijzer-dag/studiewijzer-dag.component';
import { StudiewijzerFilterDropdownComponent } from '../studiewijzer-filter-dropdown/studiewijzer-filter-dropdown.component';
import { Modus, StudiewijzerItemDetailComponent } from '../studiewijzer-item-detail/studiewijzer-item-detail.component';
import { StudiewijzerLijstComponent } from '../studiewijzer-lijst/studiewijzer-lijst.component';
import { StudiewijzerWekenHeaderComponent } from '../studiewijzer-weken-header/studiewijzer-weken-header.component';
import { StudiewijzerWekenComponent } from '../studiewijzer-weken/studiewijzer-weken.component';

export const vandaag = startOfToday();

export type PeildatumTrigger = 'DagenHeader' | 'StudiewijzerDag' | 'StudiewijzerLijst';

@Component({
    selector: 'sl-studiewijzer',
    imports: [
        CommonModule,
        StudiewijzerWekenHeaderComponent,
        StudiewijzerWekenComponent,
        StudiewijzerDagComponent,
        ScrollableTitleComponent,
        HorizontalSwipeDirective,
        DagenHeaderComponent,
        HeaderComponent,
        HeaderActionButtonComponent,
        TabBarComponent,
        StudiewijzerLijstComponent,
        SpinnerComponent
    ],
    templateUrl: './studiewijzer.component.html',
    styleUrl: './studiewijzer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronLinks, IconChevronRechts, IconInleveropdracht)]
})
export class StudiewijzerComponent implements OnInit, OnDestroy, GuardableComponent, AfterViewInit {
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
    private _weergaveService = inject(WeergaveService);
    private _headerService = inject(HeaderService);

    private _lastRefreshed = new Date();

    public studiewijzerModus = this._weergaveService.studiewijzerModus;
    public isLijstView = computed(() => !this.isTabletOfDesktop() && this.studiewijzerModus() === 'lijstview');
    public toonWeekend = signal(false);
    public isTabletOfDesktop = toSignal(this._deviceService.isTabletOrDesktop$, { initialValue: this._deviceService.isTabletOrDesktop() });
    public scrollableTitle$: Observable<string | undefined> = this._studiewijzerService.scrollableTitle$;
    public vakkeuzes = derivedAsync(() => (this.isTabletOfDesktop() ? this._vakkeuzeService.getVakkeuzes() : of([])));
    public activeFilters = signal<SelectedFilters>({ swiType: [], vak: [] });
    public weekEnDagItems = derivedAsync(() => this.getStudiewijzerItemsVoorDrieWeken(this.peildatum(), this.activeFilters()));

    public headerActionFilterCounter = computed(() => this.activeFilters().swiType.length + this.activeFilters().vak.length);

    public paramDatumString = injectQueryParams(STUDIEWIJZER_PARAMETERS.PEILDATUM);
    public paramPeildatumTrigger = injectQueryParams(STUDIEWIJZER_PARAMETERS.PEILDATUM_TRIGGER);

    public peildatumTrigger: Signal<PeildatumTrigger | undefined> = computed(() => {
        switch (this.paramPeildatumTrigger()) {
            case 'DagenHeader':
                return 'DagenHeader';
            case 'StudiewijzerDag':
                return 'StudiewijzerDag';
            case 'StudiewijzerLijst':
                return 'StudiewijzerLijst';
        }
        return undefined;
    });

    public paramTab = injectQueryParams(STUDIEWIJZER_PARAMETERS.STUDIEWIJZER_TAB);
    public paramStudiewijzerItemId = injectQueryParams(STUDIEWIJZER_PARAMETERS.STUDIEWIJZER_ITEM);
    public paramStudiewijzerItemJaarWeek = injectQueryParams(STUDIEWIJZER_PARAMETERS.STUDIEWIJZER_ITEM_JAARWEEK);

    public paramStudiewijzerItem = derivedAsync(() => {
        const itemStringId = this.paramStudiewijzerItemId();
        const jaarweek = this.paramStudiewijzerItemJaarWeek();
        if (!itemStringId || !jaarweek) return undefined;

        const itemId = Number(itemStringId);
        return this._studiewijzerService.getStudiewijzerItem(jaarweek, itemId);
    });

    public queryPeildatum = computed(() => {
        const param = this.paramDatumString();
        let datum = param ? parse(param, STUDIEWIJZER_PEILDATUM_DATUMFORMAT, new Date()) : new Date();

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

    // De lijstview opbouwen duurt best lang, waardoor de navigatie een beetje blijft hangen.
    // Door eerst een spinner te tonen, en daarna pas de lijstview te renderen.
    public renderLijstview = signal(false);

    constructor() {
        effect(() => {
            this.peildatum.set(this.queryPeildatum());
            this.updateScrollableTitle();
            this._studiewijzerService.refreshStudiewijzerEnOmliggendeWeken(this.peildatum());
        });

        let studiewijzerItemOpened = false;
        effect(() => {
            const studiewijzerItem = this.paramStudiewijzerItem();

            if (!this.paramStudiewijzerItemId() || !studiewijzerItem) return;

            if (studiewijzerItemOpened) {
                this._sidebarService.updateInputs(StudiewijzerItemDetailComponent, {
                    item: studiewijzerItem,
                    showBackButton: false
                });
                return;
            }

            const detailComponent = this._sidebarService.push(
                StudiewijzerItemDetailComponent,
                { item: studiewijzerItem, showBackButton: false },
                StudiewijzerItemDetailComponent.getSidebarSettings(studiewijzerItem, this._sidebarService, true),
                () => {
                    studiewijzerItemOpened = false;
                }
            );
            this._sidebarService.registerCloseGuard(StudiewijzerItemDetailComponent, () => this.canDeactivate(), [
                'backdrop-click',
                'escape-key',
                'page-back'
            ]);
            studiewijzerItemOpened = true;

            const tab = this.paramTab();
            if (tab) {
                detailComponent.setInitialModus(tab as Modus);
            }
        });

        effect(() => {
            this._headerService.toonAltijdScollableTitle = this.isLijstView();
            this.updateScrollableTitle();
        });

        this._keyPressedService.mainKeyboardEvent$.pipe(takeUntilDestroyed()).subscribe((event) => this.onKeyDown(event));

        onRefreshOrRedirectHome([getRestriction(STUDIEWIJZER)], () => {
            if (this.isTabletOfDesktop()) {
                this._vakkeuzeService.refreshVakkeuzes();
            }

            if (isSameDay(new Date(), this._lastRefreshed)) {
                this._studiewijzerService.refreshStudiewijzerEnOmliggendeWeken(this.peildatum());
            } else {
                this.updatePeildatumVandaag();
            }
            this._lastRefreshed = new Date();
        });
    }
    ngAfterViewInit(): void {
        this.renderLijstview.set(true);
    }

    ngOnDestroy(): void {
        this._headerService.toonAltijdScollableTitle = false;
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

    private updateScrollableTitle() {
        const formatDate = format(this.peildatum(), 'MMMM', { locale: nl });
        const titel = formatDate.charAt(0).toUpperCase() + formatDate.slice(1);
        if (this.isLijstView()) {
            this._headerService.title = titel;
        } else {
            this._studiewijzerService.scrollableTitle = titel;
        }
    }

    /**
     * Als de peildatum in het weekend valt, wordt de eerstvolgende maandag gekozen.
     */
    private getWeekdagOfMaandag(date: Date) {
        return isWeekend(date) ? (isSaturday(date) ? addDays(date, 2) : addDays(date, 1)) : date;
    }

    public updatePeildatum(date: Date, trigger?: PeildatumTrigger): void {
        if (!valtBinnenHuidigeSchooljaar(date)) return;
        this._router.navigate([], {
            queryParams: {
                [STUDIEWIJZER_PARAMETERS.PEILDATUM]: format(date, STUDIEWIJZER_PEILDATUM_DATUMFORMAT),
                [STUDIEWIJZER_PARAMETERS.PEILDATUM_TRIGGER]: trigger
            },
            queryParamsHandling: 'merge',
            // in lijstview willen we history-state niet aanpassen
            // // Bij een backswipe gaan we dan echt naar de vorige pagina ipv dat we terugscollen naar de vorige peildatum.
            replaceUrl: !this.isTabletOfDesktop() && this.studiewijzerModus() === 'lijstview'
        });
    }

    public updatePeildatumVandaag() {
        this.updatePeildatum(new Date());
    }

    public openInleveropdrachten() {
        this._sidebarService.push(InleveringenListComponent, {}, InleveringenListComponent.getSidebarSettings());
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
        this._studiewijzerService.refreshStudiewijzerEnOmliggendeWeken(date);
        this.peildatum.set(date);
        this.maandnummer.set(getMonth(date));
    }

    public canDeactivate(): Observable<boolean> {
        const component = this._sidebarService.getSidebarComponent(StudiewijzerItemDetailComponent);
        return component?.canDeactivate() ?? of(true);
    }
}
