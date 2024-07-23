import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { isSameDay, isSameYear, setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns';
import { ButtonComponent, IconDirective, SignalInputs, isPresent } from 'harmony';
import { IconBewerken, IconKalenderToevoegen, IconNoRadio, IconYesRadio, provideIcons } from 'harmony-icons';
import { SchoolContactgegevensComponent } from 'leerling-account-modal';
import { SomtodayLeerling } from 'leerling-authentication';
import { AccessibilityService, SidebarService, SidebarSettings, capitalize, createSidebarSettings, formatNL } from 'leerling-util';
import { SAbsentieMeldingInvoer, SAbsentieReden } from 'leerling/store';
import { catchError, filter, of, pairwise } from 'rxjs';
import { AbsentieService } from '../services/absentie.service';
import { DagOptie, TijdOptie } from './afwezig-melden-model';
import { DatumSelectieComponent } from './datum-selectie/datum-selectie.component';

@Component({
    selector: 'sl-afwezig-melden-wizard',
    standalone: true,
    imports: [SchoolContactgegevensComponent, ButtonComponent, DatumSelectieComponent, FormsModule, IconDirective],
    providers: [provideIcons(IconYesRadio, IconNoRadio, IconBewerken, IconKalenderToevoegen)],
    templateUrl: './afwezig-melden-wizard.component.html',
    styleUrl: './afwezig-melden-wizard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AfwezigMeldenWizardComponent {
    private absentieService = inject(AbsentieService);
    private accessibilityService = inject(AccessibilityService);
    private elementRef = inject(ElementRef);

    // inputs
    absentieRedenen = input.required<SAbsentieReden[]>();
    leerling = input.required<SomtodayLeerling>();

    // outputs
    isDirty = output<boolean>();

    // de waardes die geselecteerd / ingevoerd worden door de gebruiker
    absentieReden = model<SAbsentieReden>();
    beginDag = model<DagOptie>();
    beginTijd = model<TijdOptie>();
    eindDag = model<DagOptie>();
    eindTijd = model<TijdOptie>();
    opmerkingText = model<string>();

    // wizard flow state
    huidigeStapNaam = signal<StapNaam>('Reden');
    huidigeStapIndex = computed(() => StapNamen.indexOf(this.huidigeStapNaam()));
    isEersteStap = computed(() => this.huidigeStapIndex() === 0);
    isVersturenStap = computed(() => this.huidigeStapNaam() === 'Samenvatting');
    leerlingNaam = computed(() => this.leerling()?.nn || '');
    progressBarCompletedSteps = computed(() => StapNamen.map((_, stapIndex) => stapIndex <= this.huidigeStapIndex()));
    versturenError = signal<string | undefined>(undefined);
    versturenInProgress = signal(false);

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
        return {
            disabled: !this.isHuidigeStapValid() || this.versturenInProgress(),
            label: this.isHuidigeStapValid() ? (this.isVersturenStap() ? 'Versturen' : 'Volgende') : 'Maak een keuze'
        };
    });

    vorigeKnop = computed<NavigatieKnop | undefined>(() => {
        if (this.huidigeStapNaam() === 'Reden' || this.huidigeStapNaam() === 'Klaar') {
            return;
        }
        return {
            disabled: this.versturenInProgress(),
            label: 'Vorige'
        };
    });

    constructor() {
        toObservable(this.absentieReden)
            .pipe(
                pairwise(),
                // enkel doorgaan als de gekozen absentiereden daadwerkelijk verandert
                filter(([previous, current]) => previous !== current),
                takeUntilDestroyed()
            )
            .subscribe(([, absentieReden]) => {
                // reset de volledige state (behalve absentiereden), omdat andere opties daarvan afhankelijk zijn
                this.resetState();
                this.absentieReden.set(absentieReden);

                // absentiereden is de eerste stap in de flow, dus zodra die gekozen is zijn we vies
                this.isDirty.emit(!!absentieReden);
            });

        effect(
            () => {
                // triggert als leerling en/of absentieredenen inputs zijn veranderd, bijv. na context switch
                if (this.leerling() && this.absentieRedenen()) {
                    this.resetState();
                    this.gaNaarEersteStap();

                    // als er maar 1 reden is, selecteer deze dan automatisch
                    if (this.absentieRedenen().length === 1) {
                        this.absentieReden.set(this.absentieRedenen()[0]);
                    }
                }
            },
            { allowSignalWrites: true }
        );
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
        const beginTijd = this.beginTijd();
        const eindDag = this.eindDag();
        const eindTijd = this.eindTijd();

        if (!beginDag) {
            throw new Error(`Begindatum ontbreekt`);
        }

        const formatDag = (date: Date) => formatNL(date, isSameYear(date, new Date()) ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy');
        const formatTijd = (tijdOptie?: TijdOptie) => `${tijdOptie?.text} uur`;

        let text = capitalize(formatDag(beginDag.date));

        if (eindDag) {
            // speciale notatie voor zelfde dag
            if (isSameDay(beginDag.date, eindDag.date)) {
                if (beginDag.heleDag && eindDag.heleDag) {
                    // begin hele dag, eind hele dag: "woensdag 17 juni, hele dag"
                    text += `, hele dag`;
                } else if (beginDag.heleDag && !eindDag.heleDag) {
                    // begin hele dag, eind tijd: "woensdag 17 juni t/m 15:00 uur"
                    text += ` t/m ${formatTijd(eindTijd)}`;
                } else if (!beginDag.heleDag && eindDag.heleDag) {
                    // begin tijd, eind hele dag: "woensdag 17 juni, 15:00 uur tot einde dag"
                    text += `, ${formatTijd(beginTijd)} tot einde dag`;
                } else {
                    // begin tijd, eind tijd: "woensdag 17 juni, 15:00 uur t/m 15:30 uur"
                    text += `, ${formatTijd(beginTijd)} t/m ${formatTijd(eindTijd)}`;
                }
            } else {
                // bijv: "woensdag 17 juni, 15:00 uur t/m donderdag 18 juni, hele dag"
                text += `, ${beginDag.heleDag ? 'hele dag' : `${formatTijd(beginTijd)}`}`;
                text += ` t/m ${formatDag(eindDag.date)}`;
                text += `, ${eindDag.heleDag ? 'hele dag' : `${formatTijd(eindTijd)}`}`;
            }
        } else {
            // geen einddatum: "vanaf woensdag 17 juni, 15:00 uur"
            text = `Vanaf ${formatDag(beginDag.date)}`;
            text += `, ${beginDag.heleDag ? 'hele dag' : `${formatTijd(beginTijd)}`}`;
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
        }
    }

    nieuweMelding() {
        this.gaNaarEersteStap();
    }

    private isEinddatumIngevuld(eindDag: DagOptie | undefined, absentieReden: SAbsentieReden | undefined): boolean {
        if (eindDag) return true;

        // einddatum hoeft niet ingevuld te worden als die niet verplicht is of standaard wordt afgehandeld
        return !absentieReden?.verzorgerEinddatumVerplicht && !absentieReden?.standaardAfgehandeld;
    }

    private gaNaarEersteStap() {
        this.gaNaarStap(StapNamen[0]);
    }

    private resetState() {
        this.absentieReden.set(undefined);
        this.beginDag.set(undefined);
        this.beginTijd.set(undefined);
        this.eindDag.set(undefined);
        this.eindTijd.set(undefined);
        this.opmerkingText.set(undefined);
    }

    private verstuurAbsentieMelding() {
        if (this.versturenError()) {
            this.versturenError.set(undefined);
        }

        const leerling = this.leerling();
        const absentieReden = this.absentieReden();
        const beginDag = this.beginDag();
        const beginTijd = this.beginTijd();
        const eindDag = this.eindDag();
        const eindTijd = this.eindTijd();
        const opmerkingen = this.opmerkingText();

        if (!leerling || !absentieReden || !beginDag) {
            throw new Error(`Vereiste data niet beschikbaar voor versturen absentiemelding`);
        }

        this.versturenInProgress.set(true);

        const invoer: SAbsentieMeldingInvoer = {
            absentieReden,
            leerling: { leerlingnummer: leerling.nr },
            beginDatumTijd: this.createDatumTijdFromOpties(beginDag, beginTijd),
            datumTijdInvoer: new Date(),
            isHeleDagBeginDatum: beginDag.heleDag,
            opmerkingen
        };

        if (eindDag) {
            invoer.eindDatumTijd = this.createDatumTijdFromOpties(eindDag, eindTijd);
            invoer.isHeleDagEindDatum = eindDag.heleDag;
        }

        this.absentieService
            .verstuurAbsentieMelding(invoer)
            .pipe(catchError((error) => of(error)))
            .subscribe((result) => {
                this.versturenInProgress.set(false);

                if (result instanceof HttpErrorResponse) {
                    const errorMessage = result.error?.message;
                    if (errorMessage) {
                        this.onVersturenError(errorMessage);
                    } else {
                        this.onVersturenError();
                    }
                } else {
                    this.onVersturenSuccess();
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

    private onVersturenSuccess(): void {
        this.gaNaarStap('Klaar');
        this.resetState();
    }

    private createDatumTijdFromOpties(dagOptie: DagOptie, tijdOptie?: TijdOptie): Date {
        let datumTijd = dagOptie.date;
        if (!dagOptie.heleDag && tijdOptie) {
            datumTijd = setHours(datumTijd, tijdOptie.hours);
            datumTijd = setMinutes(datumTijd, tijdOptie.minutes);
            datumTijd = setSeconds(datumTijd, 0);
            datumTijd = setMilliseconds(datumTijd, 0);
        }
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

type NavigatieKnopLabel = 'Maak een keuze' | 'Versturen' | 'Volgende' | 'Vorige';
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
