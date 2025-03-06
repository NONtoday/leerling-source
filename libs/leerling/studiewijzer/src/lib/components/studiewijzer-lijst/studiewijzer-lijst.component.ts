import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    OnChanges,
    output,
    signal,
    viewChildren,
    WritableSignal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { ScreenReader } from '@capacitor/screen-reader';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { addDays, getISOWeek, getISOWeekYear, isSameDay, subDays } from 'date-fns';
import { isPresent, SpinnerComponent } from 'harmony';
import { STUDIEWIJZER } from 'leerling-base';
import { isIOS, onRefresh, RefreshReason } from 'leerling-util';
import { derivedAsync } from 'ngxtension/derived-async';
import { asyncScheduler, debounceTime, filter, fromEvent, startWith, throttleTime } from 'rxjs';
import { StudiewijzerWeek } from '../../services/studiewijzer-model';
import { StudiewijzerService, vulWeken } from '../../services/studiewijzer.service';
import {
    StudiewijzerLijstWeekComponent,
    WEEK_DIVIDER_HEIGHT,
    WEEK_HEADER_HOOGTE
} from '../studiewijzer-lijst-week/studiewijzer-lijst-week.component';
import { PeildatumTrigger } from '../studiewijzer/studiewijzer.component';

// 64 pixels header + 68 pixels dagenheader + 1 pixel om daaronder uit te komen.
export const SCROLL_OFFSET = 133;

@Component({
    selector: 'sl-studiewijzer-lijst',
    standalone: true,
    imports: [CommonModule, StudiewijzerLijstWeekComponent, SpinnerComponent],
    templateUrl: './studiewijzer-lijst.component.html',
    styleUrls: ['./studiewijzer-lijst.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerLijstComponent implements OnChanges, AfterViewInit {
    datum = input.required<Date>();
    peildatumTrigger = input.required<PeildatumTrigger | undefined>();
    toonWeekend = input.required<boolean>();

    public refreshStudiewijzer = output<Date>();
    public peildatumChange = output<Date>();

    weekComponents = viewChildren(StudiewijzerLijstWeekComponent);

    public initielePeildatum: WritableSignal<Date | undefined> = signal(undefined);

    // Als de gebruiker terug in de tijd scrollt, dan worden er historische items geladen.
    // Hiermee verspringt het scherm heel veel. Dit corrigeren we wel, maar het scherm lijkt wel alle kanten op te springen.
    // Daarom halen we alvast huiswerk 3 weken in het verleden op: op die manier kan de leerling 1 a 2 weken terugscrollen zonder dat het scherm verspringt.
    private swi3WekenTerugLoaded = derivedAsync(() => this._studiewijzerService.isStudiewijzerLoaded(subDays(this.datum(), 21)));
    private swi2WekenTerugLoaded = derivedAsync(() => this._studiewijzerService.isStudiewijzerLoaded(subDays(this.datum(), 14)));
    private swiVorigeweekLoaded = derivedAsync(() => this._studiewijzerService.isStudiewijzerLoaded(subDays(this.datum(), 7)));
    private swiDezeWeekLoaded = derivedAsync(() => this._studiewijzerService.isStudiewijzerLoaded(this.datum()));
    private swiVolgendeweekLoaded = derivedAsync(() => this._studiewijzerService.isStudiewijzerLoaded(addDays(this.datum(), 7)));

    // boolean met of de SWI voor deze peildatum in de store staan
    // Pas als die in de store staan, tonen we het scherm, tot die tijd 1 grote spinner.
    public isStudiewijzerLoaded = computed(
        () =>
            this.swiVorigeweekLoaded() &&
            this.swiDezeWeekLoaded() &&
            this.swiVolgendeweekLoaded() &&
            this.swi2WekenTerugLoaded() &&
            this.swi3WekenTerugLoaded()
    );

    private aantalItemsTotPeilweek = derivedAsync(() => this._studiewijzerService.getAantalItemsTotPeilweek(this.datum()));

    // Met een iOS screenreader werkt alles wat anders.
    private isIOSScreenReader = signal(false);
    private isResumedWithIOSScreenreader = signal(false);

    public isViewInitReady = signal(false);

    public initialLoadCompleted = signal(false);

    private isTouchMoved = false;
    private isScrolling = false;
    private initieelAantalItemsTotPeilweek = 0;

    private _studiewijzerService = inject(StudiewijzerService);

    private _router = inject(Router);

    public weken: StudiewijzerWeek[];

    public deviceScrollOffset = signal(0);
    public scrollOffset = computed(() => SCROLL_OFFSET + this.deviceScrollOffset());

    constructor() {
        this.detectScreenreader();

        effect(() => {
            if (!this.initialLoadCompleted()) {
                this._studiewijzerService.refreshStudiewijzer(subDays(this.datum(), 14));
                this._studiewijzerService.refreshStudiewijzer(subDays(this.datum(), 21));
            }
        });

        // Als we terug in de tijd scrollen, dan gaan we studiewijzeritems bij-laden.
        // dan zal het scherm verspringen en dit moeten we corrigeren.
        effect(() => {
            const aantalItemsTotPeilweek = this.aantalItemsTotPeilweek() ?? 0;
            if (aantalItemsTotPeilweek !== this.initieelAantalItemsTotPeilweek && this.isTouchMoved) {
                const datum = this.datum();
                this.scrollToDatum(datum, () => {
                    this.initieelAantalItemsTotPeilweek = this._studiewijzerService.getAantalItemsTotPeilweekSnapshot(datum);
                });
            }
        });

        if (isIOS()) {
            fromEvent(window, 'resize')
                .pipe(debounceTime(50), takeUntilDestroyed(), startWith(new Event('resize')))
                .subscribe(() => {
                    SafeArea.getSafeAreaInsets().then(({ insets }) => {
                        this.deviceScrollOffset.set(insets.top);
                    });
                });
        }

        // We hebben nogal wat uitdagingen met de scroll-positie.
        // Als de gebruiker scrollt, dan willen we daarop reageren door de peildatum aan te passen.
        // Er zijn echter nogal wat andere redenen dat we een 'scroll'-event binnenkrijgen:
        // - Als de pagina-inhoud wijzigt (bijvoorbeelt bij een leerlingswitch, of bij het bijladen van (historische) weken)
        // - Als de gebruiker nogmaals op het STUDIEWIJZER-menu-item klikt (dan wil hij zelf naar boven a.k.a. als 1 augustus)
        // - Als we gaan corrigeren voor een verkeerde scrollpositie (die ontstaan is door een van bovenstaande punten) triggert ook weer een scroll-event.

        // Dit maakt dat het scherm nog al eens alle kanten op vliegt, voor hij de juiste peildatum bovenin heeft gerenderd.
        // Om de gebruiker hier niet mee lastig te vallen, hebben we een 'gordijntje' (in de vorm van een blanco canvas met een spinner) voor het scherm gehangen,
        // die het gepuzzel op de achtergrond verhuld. Zolang de 'initialLoadCompleted' nog niet klaar is, zal het gordijn zichtbaar zijn.

        // Pas als we de data van de studiewijzer geladen hebben, en de view-init is uitgevoerd, is 'initialLoadCompleted'.
        effect(() => {
            if (!this.initialLoadCompleted() && this.isStudiewijzerLoaded() && this.isViewInitReady()) {
                const datum = this.initielePeildatum() ?? this.datum();
                this.initieelAantalItemsTotPeilweek = this._studiewijzerService.getAantalItemsTotPeilweekSnapshot(datum);
                this.scrollToDatum(datum, () => this.initialLoadCompleted.set(true));
            }
        });

        // Detecteer of de gebruiker op het STUDIEWIJZER-menu-item klikt => in dat geval zetten we de loading state.
        this._router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd && event.url === '/' + STUDIEWIJZER),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                setTimeout(() => {
                    this.initialLoadCompleted.set(false);
                });
            });

        // Zolang de gebuiker zelf niet zijn device getoucht heeft om te scrollen, weten we zeker dat andere scroll-events de peildatum niet aan moeten passen.
        // Dit voorkomt vooral dat we gaan reageren op de initiële scroll-bewegingen met het eerst keer laden van het component en huiswerk.
        fromEvent(window, 'touchmove')
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                this.isTouchMoved = true;
            });

        fromEvent(window, 'scroll')
            .pipe(
                // Performance: elke 100ms gaan we aan de slag.
                throttleTime(100, asyncScheduler, { leading: false, trailing: true }),
                filter(() => isPresent(this.weekComponents())),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                const bovensteDag = this.getBovensteDagInBeeld();
                // De huidige week wil ook graag weten dat we gescolld zijn.
                // Om te voorkomen dat we 52 scroll-listeners hebben, doen we dat hier centraal.
                this.getWeekVoorDatum(bovensteDag)?.peilweekIsScrolled();

                // Pas als de gebruiker zelf en poging tot scrollen heeft ondernomen, gaan we daar actie op ondernemen.
                // (uitgezonderd iOS met screenreader, daar krijgen we geen touchMove mee)
                if ((!this.isScrolling && this.isTouchMoved) || (this.isIOSScreenReader() && !this.isResumedWithIOSScreenreader())) {
                    this.initieelAantalItemsTotPeilweek = this._studiewijzerService.getAantalItemsTotPeilweekSnapshot(bovensteDag);
                    this.refreshStudiewijzer.emit(bovensteDag);
                    this.peildatumChange.emit(bovensteDag);
                } else if (this.isResumedWithIOSScreenreader()) {
                    // De IOS screenreader scrollt automatisch terug naar boven bij een 'onResume'.
                    // Het is voor de gebruiker handig om verder te gaan waar hij gebleven was,
                    // dus scrollen we maar weer terug naar waar hij gebleven was.
                    this.isResumedWithIOSScreenreader.set(false);
                    this.scrollToDatum(this.initielePeildatum() ?? this.datum());
                }
            });

        effect(() => {
            if (!this.isViewInitReady()) return;

            // Bij een peildatumwijziging vanuit de header moeten we naar de juiste datum scrollen.
            if (this.datum() && this.peildatumTrigger() === 'DagenHeader') {
                this.scrollToDatum(this.datum());
            }
        });

        onRefresh((reason) => {
            this.initielePeildatum.set(this.datum());

            if (reason === RefreshReason.LEERLING_SWITCH) {
                this.isTouchMoved = false;

                // Pas na een 'tick' is de leerlingswitch overal goed doorgebubbeld en is de studiewijzer-store gereset
                // Vanaf dat moment zijn we weer aan het 'loaden'.
                setTimeout(() => {
                    this.initialLoadCompleted.set(false);
                });
            } else if (reason === RefreshReason.RESUME && this.isIOSScreenReader()) {
                this.isResumedWithIOSScreenreader.set(true);
            }
            this.initieelAantalItemsTotPeilweek = this._studiewijzerService.getAantalItemsTotPeilweekSnapshot(this.datum());
            this.refreshStudiewijzer.emit(this.datum());
        });
    }

    private async detectScreenreader() {
        if (!isIOS()) {
            return;
        }

        this.isIOSScreenReader.set((await ScreenReader.isEnabled()).value);
    }

    ngOnChanges(): void {
        this.refreshStudiewijzer.emit(this.datum());
        this.weken = vulWeken(this.datum());
    }

    ngAfterViewInit(): void {
        this.isViewInitReady.set(true);
    }

    private getBovensteDagInBeeld(): Date {
        // We zoeken weken die in beeld zijn.
        const weekComponentsInBeeld: StudiewijzerLijstWeekComponent[] = [];
        const windowHeight = window.innerHeight;
        for (let i = 0; i < this.weekComponents().length; i++) {
            const weekComponent = this.weekComponents()[i];
            if (!weekComponent) continue;

            const weekBoundingRect = weekComponent.elementRef.nativeElement.getBoundingClientRect();
            // Overlapt de week met het scherm?
            if (weekBoundingRect.top <= windowHeight && this.scrollOffset() <= weekBoundingRect.bottom) {
                weekComponentsInBeeld.push(weekComponent);
                // Als we 2 weken hebben, dan hebben we er voldoende, we zijn namelijk alleen in de bovenste geïntresseerd.
                // De 1e kan een sticky header zijn, daarom nemen we voor de zekerheid er 2.
                if (weekComponentsInBeeld.length === 2) {
                    break;
                }
            }
        }

        if (weekComponentsInBeeld.length === 0) return new Date();

        const currentWeekComponent = this.getWeekVoorDatum(this.datum());
        const isWeekheaderInBeeld = currentWeekComponent?.heeftWeektaken() ?? false;

        // Het kan zijn dat de eerst gevonden weekheader nog 'sticky' is, maar dat er geen enkele dag van in beeld is.
        // In dat geval zoeken we de eerste waarbij er een dag in beeld is.
        for (let i = 0; i < weekComponentsInBeeld.length; i++) {
            const bovensteDatum = weekComponentsInBeeld[i].getBovensteDatumInBeeldInDitSchooljaar(isWeekheaderInBeeld);
            if (bovensteDatum) {
                return bovensteDatum;
            }
        }

        // Geen dag in beeld, maar schijnbaar wel een week, dan maar de eerste dag van die week.
        return weekComponentsInBeeld[0].week().dagen[0].datum;
    }

    public onScrollNaarWeek(week: StudiewijzerWeek) {
        const weekComponent = this.getWeekVoorDatum(week.dagen[0].datum);
        if (!weekComponent) return;

        window.scrollTo({
            top:
                weekComponent.elementRef.nativeElement.getBoundingClientRect().top -
                this.scrollOffset() +
                WEEK_DIVIDER_HEIGHT +
                window.scrollY
        });
    }

    private scrollToDatum(datum: Date, callback?: () => void) {
        const week = this.getWeekVoorDatum(datum);
        const dag = week?.dagenComponents().find((dag) => isSameDay(datum, dag.dag().datum));
        if (!week || !dag) return;

        const offset = this.scrollOffset() + (week.heeftWeektaken() ? WEEK_HEADER_HOOGTE : 0);
        this.scrollIfScrollPositionSettles(datum, dag.elementRef, offset, callback);
    }

    // Het komt voor dat we moeten scrollen, maar dat het scherm nog niet klaar is met renderen.
    // Daarom bepalen we elke 50 miliseconde de potentiële scrollpositie.
    // Hebben we 2x achter elkaar dezelfde scrollpositie berekend, dan gaan we ook echt scrollen.
    private scrollIfScrollPositionSettles(
        datum: Date,
        elementRef: ElementRef<any>,
        offset: number,
        callback?: () => void,
        previousCalculatedScrollPostion?: number
    ) {
        this.isScrolling = true;
        const calculatedScrollPosition = elementRef.nativeElement.getBoundingClientRect().top - offset + window.scrollY;
        if (previousCalculatedScrollPostion === undefined || previousCalculatedScrollPostion !== calculatedScrollPosition) {
            setTimeout(() => this.scrollIfScrollPositionSettles(datum, elementRef, offset, callback, calculatedScrollPosition), 50);
        } else {
            window.scrollTo({ top: calculatedScrollPosition, behavior: 'instant' });
            if (callback) {
                callback();
            }
            setTimeout(() => (this.isScrolling = false));
        }
    }

    public getWeekVoorDatum(datum: Date): StudiewijzerLijstWeekComponent | undefined {
        const weeknummer = getISOWeek(datum ?? new Date());
        const inputJaar = getISOWeekYear(datum) ?? new Date();
        return this.weekComponents().find((week) => week.week().weeknummer === weeknummer && week.week().jaar === inputJaar);
    }
}
