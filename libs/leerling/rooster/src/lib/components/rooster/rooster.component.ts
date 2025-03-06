import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    OnInit,
    Signal,
    ViewChild,
    WritableSignal,
    computed,
    effect,
    inject,
    signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { addDays, addWeeks, format, getDay, isSameDay, isSaturday, isWeekend, parse, subDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { DeviceService, IconDirective } from 'harmony';
import { IconChevronLinks, IconChevronRechts, IconSluiten, provideIcons } from 'harmony-icons';
import { ROOSTER, TabBarComponent, getRestriction } from 'leerling-base';
import { HeaderActionButtonComponent, HeaderComponent, HeaderService, ScrollableTitleComponent } from 'leerling-header';
import { AccessibilityService, DagenHeaderComponent, GuardableComponent, SidebarService, onRefreshOrRedirectHome } from 'leerling-util';
import {
    RechtenService,
    SStatusNotification,
    SStudiewijzerItem,
    getJaarWeek,
    isDayInCurrentSchoolyear,
    nextFridayOrDateIfFriday,
    previousMondayOrDateIfMonday
} from 'leerling/store';
import { StudiewijzerService } from 'leerling/studiewijzer';
import { derivedAsync } from 'ngxtension/derived-async';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { Observable, combineLatest, filter, map, of, tap } from 'rxjs';
import { RoosterService } from '../../services/rooster.service';
import { RoosterDagenComponent } from '../rooster-dagen/rooster-dagen.component';
import { RoosterKwtInschrijvenComponent } from '../rooster-kwt-inschrijven/rooster-kwt-inschrijven.component';
import { DirectionOfVandaag, RoosterWeekHeaderComponent } from '../rooster-week-header/rooster-week-header.component';
import { RoosterWekenComponent } from '../rooster-weken/rooster-weken.component';
import { RoosterHuiswerkStackComponent } from '../util/rooster-huiswerk-stack/rooster-huiswerk-stack.component';
import { RoosterMaatregelenComponent } from '../util/rooster-maatregelen/rooster-maatregelen.component';
import { VakantieHeaderComponent } from '../vakantie-header/vakantie-header.component';
import { VakantieWeekBegindatumPipe, VakantieWeekeinddatumPipe } from '../vakantie-header/vakantie-week.pipe';

export const PEILDATUM_PARAM = 'peildatum';
const DATUM_FORMAT = 'yyyy-MM-dd';

export interface StatusNotificationDiscardInfo {
    jaarweek: string;
    discardMoment: number;
}

@Component({
    selector: 'sl-rooster',
    imports: [
        CommonModule,
        RoosterDagenComponent,
        RoosterWekenComponent,
        DagenHeaderComponent,
        RoosterWeekHeaderComponent,
        VakantieHeaderComponent,
        ScrollableTitleComponent,
        VakantieWeekBegindatumPipe,
        VakantieWeekeinddatumPipe,
        RoosterHuiswerkStackComponent,
        HeaderComponent,
        HeaderActionButtonComponent,
        TabBarComponent,
        RoosterMaatregelenComponent,
        IconDirective
    ],
    templateUrl: './rooster.component.html',
    styleUrls: ['./rooster.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronLinks, IconChevronRechts, IconSluiten)]
})
export class RoosterComponent implements OnInit, GuardableComponent {
    @ViewChild(RoosterWeekHeaderComponent, { static: false }) roosterWeekHeader: RoosterWeekHeaderComponent;
    @ViewChild(DagenHeaderComponent, { static: false }) dagenHeader: DagenHeaderComponent;
    @ViewChild(RoosterWekenComponent, { static: false }) roosterWeken: RoosterWekenComponent;

    private _deviceService = inject(DeviceService);
    private _sidebarService = inject(SidebarService);
    public _roosterService = inject(RoosterService);
    public _headerService = inject(HeaderService);
    private _studiewijzerService = inject(StudiewijzerService);
    private _router = inject(Router);
    private _accessibilityService = inject(AccessibilityService);
    private _rechtenService = inject(RechtenService);
    private _destroyRef = inject(DestroyRef);

    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _lastRefreshed = new Date();

    public toonWeekend = signal(false);
    public isTabletOfDesktop = toSignal(this._deviceService.isTabletOrDesktop$, { initialValue: this._deviceService.isTabletOrDesktop() });
    public scrollableTitle$: Observable<string | undefined> = this._roosterService.scrollableTitle$;

    public paramDatumString = injectQueryParams(PEILDATUM_PARAM);
    public peildatum = computed(() => {
        const param = this.paramDatumString();
        let datum = param ? parse(param, DATUM_FORMAT, new Date()) : new Date();
        if (!isDayInCurrentSchoolyear(datum)) datum = new Date();
        return this.getWeekdagOfMaandag(datum);
    });

    public vorigeWeekNavigatieMogelijk = computed(() => {
        return isDayInCurrentSchoolyear(nextFridayOrDateIfFriday(addWeeks(this.peildatum(), -1)));
    });
    public volgendeWeekNavigatieMogelijk = computed(() => {
        return isDayInCurrentSchoolyear(previousMondayOrDateIfMonday(addWeeks(this.peildatum(), 1)));
    });

    public weekEnDagItems = derivedAsync(() => this._roosterService.getHuiswerkWeekEnDagItems(this.peildatum()));
    public huiswerkIndicaties = derivedAsync(() => this.getStudiewijzerItemsVoorDrieWeken(this.peildatum()));
    public dagMaatregelen = derivedAsync(() =>
        this.heeftMaatregelRechten() ? this._roosterService.getDagMaatregelen(this.peildatum()) : undefined
    );
    public heeftMaatregelRechten = derivedAsync(() =>
        this._rechtenService
            .getCurrentAccountRechten()
            .pipe(map((rechten) => rechten.absentiesBekijkenAan && rechten.absentieMaatregelBekijkenAan))
    );
    public showStack = derivedAsync(() => {
        const items = this.weekEnDagItems();
        const maatregelen = this.dagMaatregelen();
        return (items?.dagitems.length ?? 0) > 0 || (items?.weekitems.length ?? 0) > 0 || (maatregelen?.length ?? 0) > 0;
    });

    public weekNotification: Signal<SStatusNotification | undefined> = derivedAsync(() =>
        this._roosterService.getWeekNotificationsVoor(this.peildatum()).pipe(
            filter(Boolean),
            map((status: SStatusNotification[]) => status.find((not: SStatusNotification) => not.status === '4004'))
        )
    );

    public disableWeekNotificationTrigger: WritableSignal<number> = signal(0);

    public weekNotificationToShow: Signal<SStatusNotification | undefined> = computed(() => {
        this.disableWeekNotificationTrigger();
        const notification = this.weekNotification();
        return notification && !this.hasRecentlyDiscardedWeekNotification(notification, this.peildatum()) ? notification : undefined;
    });

    constructor() {
        effect(() => {
            this.updateScrollableTitle(this.peildatum());
            this._studiewijzerService.refreshStudiewijzerEnOmliggendeWeken(this.peildatum());
        });

        onRefreshOrRedirectHome([getRestriction(ROOSTER)], () => {
            if (isSameDay(new Date(), this._lastRefreshed)) {
                const aantalDagen = this.isTabletOfDesktop() ? 7 : 1;
                this._roosterService.refreshRooster(subDays(this.peildatum(), aantalDagen));
                this._roosterService.refreshRooster(this.peildatum());
                this._roosterService.refreshRooster(addDays(this.peildatum(), aantalDagen));

                this._studiewijzerService.refreshStudiewijzerEnOmliggendeWeken(this.peildatum());
                if (this.heeftMaatregelRechten()) {
                    this._roosterService.refreshMaatregelen();
                }
            } else {
                this.updatePeildatumVandaag();
            }
            this._lastRefreshed = new Date();
        });
    }

    ngOnInit() {
        this._roosterService
            .getToonWeekendPreference()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((toonWeekend) => this.toonWeekend.set(toonWeekend));
    }

    /**
     * Als de peildatum in het weekend valt, wordt de eerstvolgende maandag gekozen.
     */
    private getWeekdagOfMaandag(date: Date) {
        return isWeekend(date) ? (isSaturday(date) ? addDays(date, 2) : addDays(date, 1)) : date;
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

    hasRecentlyDiscardedWeekNotification(notification: SStatusNotification, peildatum: Date): boolean {
        const jaarWeek = getJaarWeek(peildatum);
        const potentialItem = localStorage.getItem(`weekNotificationDiscarded-${jaarWeek}`);
        if (!potentialItem) return false;
        const discardedItem = JSON.parse(potentialItem) as StatusNotificationDiscardInfo;
        if (discardedItem.jaarweek !== jaarWeek) return false;
        return discardedItem.discardMoment >= new Date().getTime() - 86400000;
    }

    discardWeek() {
        const jaarWeek = getJaarWeek(this.peildatum());
        const discardInfo: StatusNotificationDiscardInfo = {
            jaarweek: jaarWeek,
            discardMoment: new Date().getTime()
        };
        localStorage.setItem(`weekNotificationDiscarded-${jaarWeek}`, JSON.stringify(discardInfo));
        this.disableWeekNotificationTrigger.set(this.disableWeekNotificationTrigger() + 1);
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
                this.dagenHeader?.next();
                break;
            case 'previous':
                this.roosterWeken?.previous();
                this.dagenHeader?.previous();
                break;
        }
    }

    private focusHuidigeDagHeader() {
        const index = getDay(new Date()) - 1;
        const dagHeaders = this.roosterWeekHeader.dagHeaders?.toArray();
        dagHeaders[dagHeaders.length >= index ? index : 0]?.nativeElement.focus();
    }

    private getStudiewijzerItemsVoorDrieWeken(date: Date): Observable<SStudiewijzerItem[][]> {
        if (this.isTabletOfDesktop()) return of([] as SStudiewijzerItem[][]);
        const vorigeWeek = this._studiewijzerService.getStudiewijzerWeekEnDagItems(addWeeks(date, -1));
        const huidigeWeek = this._studiewijzerService.getStudiewijzerWeekEnDagItems(date);
        const volgendeWeek = this._studiewijzerService.getStudiewijzerWeekEnDagItems(addWeeks(date, 1));
        return combineLatest([vorigeWeek, huidigeWeek, volgendeWeek]).pipe(
            tap(() => {
                this._changeDetectorRef.detectChanges();
            })
        );
    }

    public canDeactivate(): Observable<boolean> {
        const component = this._sidebarService.getSidebarComponent(RoosterKwtInschrijvenComponent);
        return component?.canDeactivate() ?? of(true);
    }
}
