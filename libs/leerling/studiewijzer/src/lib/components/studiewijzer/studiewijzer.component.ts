import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnInit,
    Signal,
    ViewChild,
    ViewContainerRef,
    WritableSignal,
    computed,
    inject,
    signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
    addDays,
    addWeeks,
    format,
    getMonth,
    isFriday,
    isMonday,
    isSaturday,
    isValid,
    isWeekend,
    parse,
    startOfToday,
    subDays
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { DeviceService, SpinnerComponent, isPresent } from 'harmony';
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
import { SStudiewijzerItem, VakkeuzeService, valtBinnenHuidigeSchooljaar } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { Observable, combineLatest, distinctUntilChanged, filter, map, of, tap } from 'rxjs';
import { StudiewijzerDag } from '../../services/studiewijzer-model';
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
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerComponent implements OnInit {
    public static HUISWERKFEATURE: keyof REloRestricties = 'huiswerkBekijkenAan';

    @ViewChild(StudiewijzerWekenHeaderComponent, { static: false }) wekenHeader: StudiewijzerWekenHeaderComponent;
    @ViewChild(StudiewijzerWekenComponent, { static: false }) weken: StudiewijzerWekenComponent;

    private _deviceService = inject(DeviceService);
    private _studiewijzerService = inject(StudiewijzerService);
    private _activatedRoute = inject(ActivatedRoute);
    private _vakkeuzeService = inject(VakkeuzeService);
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _keyPressedService = inject(KeyPressedService);
    private _overlayService = inject(OverlayService);
    private _router = inject(Router);
    private _sidebarService = inject(SidebarService);
    public viewContainerRef = inject(ViewContainerRef);

    public peildatum: WritableSignal<Date>;
    public toonWeekend = signal(false);
    public maandnummer: WritableSignal<number>;
    public isTabletOfDesktop = toSignal(this._deviceService.isTabletOrDesktop$, { initialValue: this._deviceService.isTabletOrDesktop() });
    public scrollableTitle$: Observable<string | undefined> = this._studiewijzerService.scrollableTitle$;
    public vakkeuzes = toSignal(this._vakkeuzeService.getVakkeuzes());
    public activeFilters = signal<SelectedFilters>({ swiType: [], vak: [] });
    public weekEnDagItems = derivedAsync(() => this.getStudiewijzerItemsVoorDrieWeken(this.peildatum(), this.activeFilters()));
    public studiewijzerDag: Signal<StudiewijzerDag>;
    public headerActionFilterCounter = computed(() => this.activeFilters().swiType.length + this.activeFilters().vak.length);

    constructor() {
        const param = this._activatedRoute.snapshot.queryParamMap.get(PEILDATUM_PARAM);
        const peildatum = param ? parse(param, DATUM_FORMAT, vandaag) : undefined;
        this.peildatum = signal(peildatum && isValid(peildatum) ? peildatum : vandaag);
        this.maandnummer = signal(getMonth(this.peildatum()));
        this.studiewijzerDag = computed(() => this._studiewijzerService.getDag(this.peildatum()));
        this.updateScrollableTitle(vandaag);
        this.refreshStudiewijzer(this.peildatum());

        this._keyPressedService.mainKeyboardEvent$.pipe(takeUntilDestroyed()).subscribe((event) => this.onKeyDown(event));

        this._activatedRoute.queryParamMap
            .pipe(
                map((params) => {
                    if (!params.get(PEILDATUM_PARAM)) {
                        this.updatePeildatum(vandaag);
                        this.scrollNaarVandaag();
                    }
                    return params.get(PEILDATUM_PARAM);
                }),
                filter(isPresent),
                map((param) => parse(param, DATUM_FORMAT, vandaag)),
                distinctUntilChanged(),
                takeUntilDestroyed()
            )
            .subscribe((date) => {
                if (isValid(date) && valtBinnenHuidigeSchooljaar(date)) {
                    if (isWeekend(date)) {
                        const newDate = addDays(date, isSaturday(date) ? 2 : 1);
                        this.peildatum.set(newDate);
                        this.updateScrollableTitle(newDate);
                        this.refreshStudiewijzer(newDate);
                    } else {
                        this.peildatum.set(date);
                        this.updateScrollableTitle(date);
                        this.refreshStudiewijzer(date);
                    }
                } else {
                    this.updatePeildatum(vandaag);
                    this.refreshStudiewijzer(vandaag);
                }
            });

        onRefreshOrRedirectHome([StudiewijzerComponent.HUISWERKFEATURE], () => this.refreshStudiewijzer(this.peildatum()));
    }

    public refreshStudiewijzer(date: Date) {
        this._studiewijzerService.refreshStudiewijzer(subDays(date, 7));
        this._studiewijzerService.refreshStudiewijzer(date);
        this._studiewijzerService.refreshStudiewijzer(addDays(date, 7));
        this._studiewijzerService.refreshStudiewijzer(addDays(date, 14));
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
        this.wekenHeader?.vandaagButton.nativeElement.focus();
    }

    public focusHuidigeWeek() {
        const week = this.weken?.getWeekVoorDatum(new Date());
        week?.weekHeader.nativeElement.focus();
    }

    public onSwipe(next: boolean) {
        const fridayIndex = isFriday(this.peildatum()) ? 3 : 1;
        const mondayIndex = isMonday(this.peildatum()) ? -3 : -1;

        this.updatePeildatum(addDays(this.peildatum(), next ? fridayIndex : mondayIndex));
        window.scrollTo({
            top: 0,
            behavior: 'auto'
        });
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

    public scrollNaarVandaag(focusOnKeyboardAccess = false) {
        this.weken?.scrollToDatum(new Date(), 'smooth', focusOnKeyboardAccess);
    }
}
