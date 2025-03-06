import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    computed,
    effect,
    inject,
    input,
    model,
    output,
    signal
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { isSameDay, isSameYear, setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns';
import { ButtonComponent, IconDirective, SignalInputs, SpinnerComponent, ToggleComponent, isPresent } from 'harmony';
import {
    IconBewerken,
    IconChevronRechts,
    IconKalenderToevoegen,
    IconNoRadio,
    IconTelefoon,
    IconYesRadio,
    provideIcons
} from 'harmony-icons';
import { GegevensService } from 'leerling-account-modal';
import { SomtodayLeerling } from 'leerling-authentication';
import { AFWEZIGHEID } from 'leerling-base';
import { RegistratiesService } from 'leerling-registraties-data-access';
import { SRegistratieCategorieNaam, getSlugifiedCategorieNaam } from 'leerling-registraties-models';
import {
    AccessibilityService,
    SidebarService,
    SidebarSettings,
    Wizard,
    capitalize,
    createSidebarSettings,
    formatNL,
    windowOpen
} from 'leerling-util';
import { RechtenService, SAbsentieMeldingInvoer, SAbsentieReden, SLeerlingSchoolgegevens } from 'leerling/store';
import { catchError, distinctUntilChanged, filter, of, pairwise, startWith, switchMap } from 'rxjs';
import { AbsentieService } from '../services/absentie.service';
import { DagOptie, TijdOptieMinuten, TijdOptieUren } from './afwezig-melden-model';
import { DatumSelectieComponent } from './datum-selectie/datum-selectie.component';

@Component({
    selector: 'sl-afwezig-melden-wizard',
    imports: [ButtonComponent, DatumSelectieComponent, FormsModule, IconDirective, SpinnerComponent, ReactiveFormsModule, ToggleComponent],
    providers: [provideIcons(IconYesRadio, IconNoRadio, IconBewerken, IconKalenderToevoegen, IconTelefoon, IconChevronRechts)],
    templateUrl: './afwezig-melden-wizard.component.html',
    styleUrl: './afwezig-melden-wizard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AfwezigMeldenWizardComponent implements Wizard {
    private absentieService = inject(AbsentieService);
    private accessibilityService = inject(AccessibilityService);
    private elementRef = inject(ElementRef);
    private _gegevensService = inject(GegevensService);
    private _destroyRef = inject(DestroyRef);
    private _router = inject(Router);
    private _rechtenService = inject(RechtenService);

    // inputs
    absentieRedenen = input.required<SAbsentieReden[]>();
    leerling = input.required<SomtodayLeerling>();

    // outputs
    isDirty = output<boolean>();

    // de waardes die geselecteerd / ingevoerd worden door de gebruiker
    absentieReden = model<SAbsentieReden>();
    beginDag = model<DagOptie>();
    beginTijdMinuten = model<TijdOptieMinuten>();
    beginTijdUren = model<TijdOptieUren>();
    eindDag = model<DagOptie>();
    eindTijdMinuten = model<TijdOptieMinuten>();
    eindTijdUren = model<TijdOptieUren>();
    opmerkingText = model<string>();
    geenEindDatum = model<boolean>(false);
    geenEindDatumLabel = 'Weet ik niet';

    // wizard flow state
    eindDatumVerplicht = computed<boolean>(
        () => !!this.absentieReden()?.verzorgerEinddatumVerplicht || !!this.absentieReden()?.standaardAfgehandeld
    );
    huidigeStapNaam = signal<StapNaam>('Reden');
    huidigeStapIndex = computed(() => StapNamen.indexOf(this.huidigeStapNaam()));
    leerlingNaam = computed(() => this.leerling()?.nn || '');
    progressBarCompletedSteps = computed(() => StapNamen.map((_, stapIndex) => stapIndex <= this.huidigeStapIndex()));
    versturenError = signal<string | undefined>(undefined);
    versturenInProgress = signal(false);
    schoolgegevens = signal<SLeerlingSchoolgegevens | undefined>(undefined);
    laatstGemeldeRegistratieGeoorloofd = signal(false);

    isHuidigeStapValid = computed<boolean>(() => {
        switch (this.huidigeStapNaam()) {
            case 'Reden':
                return isPresent(this.absentieReden());
            case 'Begindatum':
                return isPresent(this.beginDag());
            case 'Einddatum':
                return this.isEinddatumIngevuld(this.eindDag(), this.absentieReden());

            // de volgende stappen zijn optioneel of hebben geen input
            case 'Opmerking':
            case 'Samenvatting':
            case 'Klaar':
                return true;
        }
    });

    volgendeKnop = computed<NavigatieKnop | undefined>(() => {
        if (this.huidigeStapNaam() === 'Klaar') {
            return;
        }
        const isVersturenStap = this.huidigeStapNaam() === 'Samenvatting';
        return {
            disabled: !this.isHuidigeStapValid() || this.versturenInProgress(),
            label: this.isHuidigeStapValid() ? (isVersturenStap ? 'Versturen' : 'Volgende') : 'Maak een keuze'
        };
    });

    vorigeKnop = computed<NavigatieKnop | undefined>(() => {
        if (this.huidigeStapNaam() === 'Klaar' || (this.huidigeStapNaam() === 'Reden' && !this.meldingenBekijkenToegestaan())) {
            return;
        }

        return {
            disabled: this.versturenInProgress(),
            label: this.huidigeStapNaam() === 'Reden' ? 'Annuleren' : 'Vorige'
        };
    });

    meldingenBekijkenToegestaan = toSignal(
        this._rechtenService
            .heeftRecht('absentieMeldingBekijkenAan')
            .pipe(distinctUntilChanged(), startWith(this._rechtenService.heeftRechtSnapshot('absentieMeldingBekijkenAan')))
    );

    constructor() {
        toObservable(this.absentieReden)
            .pipe(
                pairwise(),
                // enkel doorgaan als de gekozen absentiereden daadwerkelijk verandert
                filter(([previous, current]) => previous !== current),
                takeUntilDestroyed()
            )
            .subscribe(([, absentieReden]) => {
                // reset begin- en eindtijd als die niet gekozen mogen worden voor de nieuwe absentiereden
                if (!absentieReden?.verzorgerMagTijdstipKiezen) {
                    this.beginTijdMinuten.set(undefined);
                    this.beginTijdUren.set(undefined);
                    this.eindTijdMinuten.set(undefined);
                    this.eindTijdUren.set(undefined);
                }

                // absentiereden is de eerste stap in de flow, dus zodra die gekozen is zijn we vies
                this.isDirty.emit(!!absentieReden);
            });

        effect(() => {
            // triggert als leerling en/of absentieredenen inputs zijn veranderd, bijv. na context switch
            if (this.leerling() && this.absentieRedenen()) {
                this.resetState();
                this.gaNaarEersteStap();

                // als er maar 1 reden is, selecteer deze dan automatisch
                if (this.absentieRedenen().length === 1) {
                    this.absentieReden.set(this.absentieRedenen()[0]);
                }
            }
        });
    }
    isAtFirstStep(): boolean {
        return this.huidigeStapIndex() === 0;
    }
    goToPreviousStep(): void {
        this.vorige();
    }

    markAsPristine(): void {
        this.isDirty.emit(false);
    }

    gaNaarStap(stapNaam: StapNaam) {
        this.versturenError.set(undefined);
        this.huidigeStapNaam.set(stapNaam);

        if (this.accessibilityService.isAccessedByKeyboard()) {
            this.focusOnElementById(HuidigeStapId);
        }
    }

    getSamenvattingWanneerText(): string {
        const beginDag = this.beginDag();
        const beginTijdMinuten = this.beginTijdMinuten();
        const beginTijdUren = this.beginTijdUren();
        const eindDag = this.eindDag();
        const eindTijdMinuten = this.eindTijdMinuten();
        const eindTijdUren = this.eindTijdUren();

        if (!beginDag) {
            throw new Error(`Begindatum ontbreekt`);
        }

        const formatDag = (date: Date) => formatNL(date, isSameYear(date, new Date()) ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy');

        const formatTijd = (uren?: TijdOptieUren, minuten?: TijdOptieMinuten) => {
            if (uren && minuten) {
                return `${uren.text}:${minuten.text} uur`;
            }
            return `hele dag`;
        };

        let text = capitalize(formatDag(beginDag.date));

        if (eindDag) {
            // speciale notatie voor zelfde dag
            if (isSameDay(beginDag.date, eindDag.date)) {
                if (beginTijdMinuten && beginTijdUren && eindTijdMinuten && eindTijdUren) {
                    // begin tijd, eind tijd: "woensdag 17 juni, 15:00 uur t/m 15:30 uur"
                    text += `, ${formatTijd(beginTijdUren, beginTijdMinuten)}`;
                    text += ` t/m ${formatTijd(eindTijdUren, eindTijdMinuten)}`;
                } else {
                    // "woensdag 17 juni, hele dag"
                    text += `, hele dag`;
                }
            } else {
                // "woensdag 17 juni, 15:00 uur t/m donderdag 18 juni, 15:30 uur"
                text += `, ${formatTijd(beginTijdUren, beginTijdMinuten)}`;
                text += ` t/m ${formatDag(eindDag.date)}`;
                text += `, ${formatTijd(eindTijdUren, eindTijdMinuten)}`;
            }
        } else {
            // geen einddatum: "vanaf woensdag 17 juni, 15:00 uur"
            text = `Vanaf ${formatDag(beginDag.date)}`;
            text += `, ${formatTijd(beginTijdUren, beginTijdMinuten)}`;
        }

        return text;
    }

    getSamenvattingWanneerAriaLabel(): string {
        return this.getSamenvattingWanneerText().replace(/,/g, '').replace('t/m', 'tot en met');
    }

    showSamenvattingOpmerkingText(): boolean {
        return !!this.opmerkingText()?.length;
    }

    volgende() {
        const actie = this.volgendeKnop()?.label;
        if (actie === 'Versturen') {
            this.verstuurAbsentieMelding();
        } else if (actie === 'Volgende') {
            this.gaNaarStap(StapNamen[this.huidigeStapIndex() + 1]);
        }
    }

    vorige() {
        if (this.versturenError()) {
            this.versturenError.set(undefined);
        }

        const actie = this.vorigeKnop()?.label;
        if (actie === 'Vorige') {
            this.gaNaarStap(StapNamen[this.huidigeStapIndex() - 1]);
        } else if (actie === 'Annuleren') {
            this._router.navigate([AFWEZIGHEID]);
        }
    }

    nieuweMelding() {
        this.gaNaarEersteStap();
    }

    openUrl(url: string) {
        windowOpen(url);
    }

    private isEinddatumIngevuld(eindDag: DagOptie | undefined, absentieReden: SAbsentieReden | undefined): boolean {
        if (eindDag) return true;

        // einddatum hoeft niet ingevuld te worden als die niet verplicht is of standaard wordt afgehandeld
        return !absentieReden?.verzorgerEinddatumVerplicht && !absentieReden?.standaardAfgehandeld && this.geenEindDatum();
    }

    private gaNaarEersteStap() {
        this.laatstGemeldeRegistratieGeoorloofd.set(false);
        this.gaNaarStap(StapNamen[0]);
    }

    private resetState() {
        this.absentieReden.set(undefined);
        this.beginDag.set(undefined);
        this.beginTijdMinuten.set(undefined);
        this.beginTijdUren.set(undefined);
        this.eindDag.set(undefined);
        this.eindTijdMinuten.set(undefined);
        this.eindTijdUren.set(undefined);
        this.opmerkingText.set(undefined);
    }

    private verstuurAbsentieMelding() {
        if (this.versturenError()) {
            this.versturenError.set(undefined);
        }

        const leerling = this.leerling();
        const absentieReden = this.absentieReden();
        const beginDag = this.beginDag();
        const beginTijdMinuten = this.beginTijdMinuten();
        const beginTijdUren = this.beginTijdUren();
        const eindDag = this.eindDag();
        const eindTijdMinuten = this.eindTijdMinuten();
        const eindTijdUren = this.eindTijdUren();
        const opmerkingen = this.opmerkingText();

        if (!leerling || !absentieReden || !beginDag) {
            throw new Error(`Vereiste data niet beschikbaar voor versturen absentiemelding`);
        }

        this.versturenInProgress.set(true);

        const invoer: SAbsentieMeldingInvoer = {
            absentieReden,
            leerling: { leerlingnummer: leerling.nr },
            beginDatumTijd: this.createDatumTijdFromOpties(beginDag, beginTijdUren, beginTijdMinuten),
            datumTijdInvoer: new Date(),
            isHeleDagBeginDatum: !absentieReden.verzorgerMagTijdstipKiezen,
            opmerkingen
        };

        if (eindDag) {
            invoer.eindDatumTijd = this.createDatumTijdFromOpties(eindDag, eindTijdUren, eindTijdMinuten);
            invoer.isHeleDagEindDatum = !absentieReden.verzorgerMagTijdstipKiezen;
        }

        this.absentieService
            .verstuurAbsentieMelding(invoer)
            .pipe(
                catchError((error) => of(error)),
                switchMap((result) =>
                    result instanceof HttpErrorResponse ? of(result) : this._registratiesService.refreshRegistraties(true)
                )
            )
            .subscribe((result) => {
                this.versturenInProgress.set(false);

                if (result instanceof HttpErrorResponse) {
                    this._gegevensService
                        .getSchoolgegevens$()
                        .pipe(takeUntilDestroyed(this._destroyRef))
                        .subscribe((schoolgegevens) => this.schoolgegevens.set(schoolgegevens));
                    const errorMessage = result.error?.message;
                    if (errorMessage) {
                        this.onVersturenError(errorMessage);
                    } else {
                        this.onVersturenError();
                    }
                } else {
                    this.onVersturenSuccess(invoer.absentieReden.geoorloofd);
                }
            });
    }

    private onVersturenError(errorMessage?: string): void {
        // deze specifieke errors willen we wél tonen aan de gebruiker, zo lang er geen slimmere oplossing voor is
        if (errorMessage && ExpectedErrorMessagePartials.some((partial) => errorMessage.includes(partial))) {
            this.versturenError.set(errorMessage);
        } else {
            this.versturenError.set('Er is iets misgegaan. Pas de gegevens aan, of probeer het later opnieuw.');
        }
        this.focusOnElementById(VersturenErrorId);
    }

    private onVersturenSuccess(geoorloofd: boolean): void {
        this.laatstGemeldeRegistratieGeoorloofd.set(geoorloofd);
        this.gaNaarStap('Klaar');
        this.resetState();
    }

    private createDatumTijdFromOpties(dagOptie: DagOptie, tijdOptieUren?: TijdOptieUren, tijdOptieMinuten?: TijdOptieMinuten): Date {
        let datumTijd = dagOptie.date;
        datumTijd = setHours(datumTijd, 0);
        datumTijd = setMinutes(datumTijd, 0);
        if (tijdOptieUren) {
            datumTijd = setHours(datumTijd, tijdOptieUren.uren);
        }
        if (tijdOptieMinuten) {
            datumTijd = setMinutes(datumTijd, tijdOptieMinuten.minuten);
        }
        datumTijd = setSeconds(datumTijd, 0);
        datumTijd = setMilliseconds(datumTijd, 0);
        return datumTijd;
    }

    private focusOnElementById(elementIdWithoutHash: string) {
        // schedule for next render tick
        setTimeout(() => {
            const element = this.elementRef.nativeElement.querySelector(`#${elementIdWithoutHash}`);
            if (!element) {
                console.error(`Element not found by id: '#${elementIdWithoutHash}'`);
            } else {
                element.focus();
            }
        });
    }

    toggleEindDatum() {
        this.eindDag.set(undefined);
        this.eindTijdMinuten.set(undefined);
        this.eindTijdUren.set(undefined);
        this.geenEindDatum.set(!this.geenEindDatum());
    }

    private _registratiesService = inject(RegistratiesService);

    gaNaarMelding(event: Event) {
        event.stopPropagation();
        if (!this._rechtenService.heeftRecht('absentieMeldingBekijkenAan')) {
            return;
        }

        // Push afwezigheid naar de state zodat het sluiten van de sidebar niet de wizard weer opent.
        window.history.pushState(null, 'Afwezigheid', '/afwezigheid');
        const detail: SRegistratieCategorieNaam = this.laatstGemeldeRegistratieGeoorloofd() ? 'Afwezig geoorloofd' : 'Afwezig ongeoorloofd';
        this._router.navigate([AFWEZIGHEID], {
            queryParams: {
                detail: getSlugifiedCategorieNaam(detail)
            }
        });
    }
}

export function createAfwezigMeldenWizardSidebarSettings(sidebarService: SidebarService): SidebarSettings {
    return createSidebarSettings({
        title: 'Afwezig melden',
        // back button wordt niet gebruikt in de wizard, omdat er al een expliciete "vorige" knop is voor de user flow
        hideMobileBackButton: true,
        // definieer standaard 'sluiten' knop expliciet, zodat die ook op mobile getoond wordt
        iconsRight: [{ name: 'sluiten', onClick: () => sidebarService.animateAndClose() }]
    });
}

type NavigatieKnopLabel = 'Maak een keuze' | 'Versturen' | 'Volgende' | 'Vorige' | 'Annuleren';
type NavigatieKnop = Pick<SignalInputs<ButtonComponent>, 'label' | 'disabled'> & { label: NavigatieKnopLabel };

const StapNamen = ['Reden', 'Begindatum', 'Einddatum', 'Opmerking', 'Samenvatting', 'Klaar'] as const;
type StapNaam = (typeof StapNamen)[number];

const HuidigeStapId = 'huidige-stap';
const VersturenErrorId = 'versturen-error';

/**
 * Dit zijn error messages die we kunnen verwachten bij het versturen van de nieuwe absentiemelding.
 * Let op: dit zijn *partial* strings, dus je zal deze moeten combineren met bijv. `errorMessage.includes(partial)`.
 */
const ExpectedErrorMessagePartials: string[] = [
    'Er is al een melding zonder einddatum voor deze leerling',
    'is al absent gemeld voor een gedeelte van deze periode'
];
