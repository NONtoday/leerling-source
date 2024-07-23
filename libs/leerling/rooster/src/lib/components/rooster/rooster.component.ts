import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, ViewChild, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { addDays, format, getDay, isSaturday, isValid, isWeekend, parse, startOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { DeviceService, SpinnerComponent, isPresent } from 'harmony';
import { TabBarComponent } from 'leerling-base';
import { REloRestricties } from 'leerling-codegen';
import { HeaderActionButtonComponent, HeaderComponent, HeaderService, ScrollableTitleComponent } from 'leerling-header';
import { AccessibilityService, DagenHeaderComponent, onRefreshOrRedirectHome } from 'leerling-util';
import { valtBinnenHuidigeSchooljaar } from 'leerling/store';
import { Observable, distinctUntilChanged, filter, map } from 'rxjs';
import { HuiswerkWeekEnDagItems, RoosterService } from '../../services/rooster.service';
import { RoosterDagenComponent } from '../rooster-dagen/rooster-dagen.component';
import { DirectionOfVandaag, RoosterWeekHeaderComponent } from '../rooster-week-header/rooster-week-header.component';
import { RoosterWekenComponent } from '../rooster-weken/rooster-weken.component';
import { RoosterHuiswerkStackComponent } from '../util/rooster-huiswerk-stack/rooster-huiswerk-stack.component';
import { VakantieHeaderComponent } from '../vakantie-header/vakantie-header.component';
import { VakantieWeekBegindatumPipe, VakantieWeekeinddatumPipe } from '../vakantie-header/vakantie-week.pipe';

export const PEILDATUM_PARAM = 'peildatum';
const DATUM_FORMAT = 'yyyy-MM-dd';

@Component({
    selector: 'sl-rooster',
    standalone: true,
    imports: [
        CommonModule,
        RoosterDagenComponent,
        RoosterWekenComponent,
        DagenHeaderComponent,
        RoosterWeekHeaderComponent,
        VakantieHeaderComponent,
        ScrollableTitleComponent,
        SpinnerComponent,
        VakantieWeekBegindatumPipe,
        VakantieWeekeinddatumPipe,
        RoosterHuiswerkStackComponent,
        HeaderComponent,
        HeaderActionButtonComponent,
        TabBarComponent
    ],
    templateUrl: './rooster.component.html',
    styleUrls: ['./rooster.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterComponent implements OnInit {
    @ViewChild(RoosterWeekHeaderComponent, { static: false }) roosterWeekHeader: RoosterWeekHeaderComponent;
    @ViewChild(RoosterWekenComponent, { static: false }) roosterWeken: RoosterWekenComponent;

    public static ROOSTERFEATURE: keyof REloRestricties = 'roosterBekijkenAan';

    private _activatedRoute = inject(ActivatedRoute);
    private _deviceService = inject(DeviceService);
    public _roosterService = inject(RoosterService);
    public _headerService = inject(HeaderService);
    private _router = inject(Router);
    private _accessibilityService = inject(AccessibilityService);
    private _destroyRef = inject(DestroyRef);

    public peildatum: WritableSignal<Date>;
    public toonWeekend = signal(false);
    public isTabletOfDesktop = toSignal(this._deviceService.isTabletOrDesktop$, { initialValue: this._deviceService.isTabletOrDesktop() });
    public scrollableTitle$: Observable<string | undefined> = this._roosterService.scrollableTitle$;
    public weekEnDagItems$: Observable<HuiswerkWeekEnDagItems>;
    public hideBorder$: Observable<boolean>;

    constructor() {
        const param = this._activatedRoute.snapshot.queryParamMap.get(PEILDATUM_PARAM);
        const vandaag = startOfDay(new Date());
        const peildatum = param ? parse(param, DATUM_FORMAT, vandaag) : undefined;
        this.peildatum = signal(peildatum && isValid(peildatum) ? peildatum : vandaag);
        this.updateScrollableTitle(vandaag);
        this.weekEnDagItems$ = this._roosterService.getHuiswerkWeekEnDagItems(this.peildatum());
        this.setHeaderBorders();

        this._activatedRoute.queryParamMap
            .pipe(
                map((params) => params.get(PEILDATUM_PARAM)),
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
                        this.weekEnDagItems$ = this._roosterService.getHuiswerkWeekEnDagItems(newDate);
                    } else {
                        this.peildatum.set(date);
                        this.updateScrollableTitle(date);
                        this.weekEnDagItems$ = this._roosterService.getHuiswerkWeekEnDagItems(date);
                    }
                    this.setHeaderBorders();
                } else {
                    this.updatePeildatum(vandaag);
                    this.weekEnDagItems$ = this._roosterService.getHuiswerkWeekEnDagItems(vandaag);
                    this.setHeaderBorders();
                }
            });

        onRefreshOrRedirectHome([RoosterComponent.ROOSTERFEATURE], () => this._roosterService.refreshRooster(this.peildatum()));
    }

    ngOnInit() {
        this._roosterService
            .getToonWeekendPreference()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((toonWeekend) => this.toonWeekend.set(toonWeekend));
    }

    private setHeaderBorders() {
        this.hideBorder$ = this.weekEnDagItems$.pipe(
            map((weekEnDagItems) => weekEnDagItems.weekitems.length > 0 || weekEnDagItems.dagitems.length > 0)
        );
    }

    public updatePeildatum(date: Date): void {
        this._router.navigate([], {
            queryParams: { [PEILDATUM_PARAM]: format(date, DATUM_FORMAT) },
            queryParamsHandling: 'merge'
        });
    }

    focusVolgendeWeekMaandag() {
        this.onNavigation('next');
        this.roosterWeekHeader.dagHeaders?.first?.nativeElement.focus();
    }

    updatePeildatumVandaag() {
        this.updatePeildatum(new Date());
    }

    public updateScrollableTitle(date: Date) {
        const formatDate = format(date, 'MMMM', { locale: nl });
        this._roosterService.scrollableTitle = formatDate.charAt(0).toUpperCase() + formatDate.slice(1);
    }

    public toggleWeekendBekijken(value: boolean) {
        this.toonWeekend.set(value);
        this._roosterService.updateToonWeekendPreference(value);
    }

    public onNavigation(direction: DirectionOfVandaag) {
        switch (direction) {
            case 'vandaag':
                this.updatePeildatum(new Date());
                if (this._accessibilityService.isAccessedByKeyboard()) {
                    this.focusHuidigeDagHeader();
                }
                break;
            case 'next':
                this.roosterWeken?.next();
                break;
            case 'previous':
                this.roosterWeken.previous();
                break;
        }
    }

    private focusHuidigeDagHeader() {
        const index = getDay(new Date()) - 1;
        const dagHeaders = this.roosterWeekHeader.dagHeaders?.toArray();
        dagHeaders[dagHeaders.length >= index ? index : 0]?.nativeElement.focus();
    }
}
