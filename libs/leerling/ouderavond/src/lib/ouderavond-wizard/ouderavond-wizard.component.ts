import { HttpErrorResponse } from '@angular/common/http';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    viewChild
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { isBefore } from 'date-fns';
import { ButtonComponent, DeviceService, SignalInputs } from 'harmony';
import { IconBewerken, IconKalenderToevoegen, IconNoRadio, IconTelefoon, IconYesRadio, provideIcons } from 'harmony-icons';
import { AccessibilityService, ResizeObserverService, Wizard } from 'leerling-util';
import { catchError, of } from 'rxjs';
import { AfspraakVerzoek, OuderavondInfo } from '../model/ouderavond.model';
import { OuderavondAanvullendeInformatieComponent } from '../ouderavond-aanvullende-informatie/ouderavond-aanvullende-informatie.component';
import { OuderavondInschrijvenComponent } from '../ouderavond-inschrijven/ouderavond-inschrijven.component';
import { OuderavondEditWrapper, OuderavondSamenvattingComponent } from '../ouderavond-samenvatting/ouderavond-samenvatting.component';
import { OuderavondService } from '../service/ouderavond.service';

export interface OuderavondData {
    keuzes: AfspraakVerzoek[];
    opmerkingVoorRoostermaker: string | undefined;
    wilGeenGesprek: boolean;
}

export type VerzendStatus = 'Succeeded' | 'Error' | 'In progress' | undefined;

@Component({
    selector: 'sl-ouderavond-wizard',
    imports: [
        ButtonComponent,
        FormsModule,
        ReactiveFormsModule,
        OuderavondInschrijvenComponent,
        OuderavondAanvullendeInformatieComponent,
        OuderavondSamenvattingComponent
    ],
    providers: [provideIcons(IconYesRadio, IconNoRadio, IconBewerken, IconKalenderToevoegen, IconTelefoon)],
    templateUrl: './ouderavond-wizard.component.html',
    styleUrl: './ouderavond-wizard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OuderavondWizardComponent implements OnInit, AfterViewInit, OnDestroy, Wizard {
    private _elementRef = inject(ElementRef);
    private _accessibilityService = inject(AccessibilityService);
    private _ouderavondService = inject(OuderavondService);
    private _resizeObserverService = inject(ResizeObserverService);
    private _deviceService = inject(DeviceService);

    private _wizardContainerRef = viewChild.required('wizardContainer', { read: ElementRef });

    public info = input.required<OuderavondInfo>();
    public paramId = input.required<string>();

    public data = signal<OuderavondData>({
        keuzes: [],
        opmerkingVoorRoostermaker: undefined,
        wilGeenGesprek: false
    });
    public isTabletOrDesktop = this._deviceService.isTabletOrDesktopSignal;

    constructor() {
        effect(() => {
            this.isDirty.emit(this.showStappen() && this.isInschrijvenValid());
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

    // outputs
    isDirty = output<boolean>();

    // wizard flow state
    huidigeStapNaam = signal<StapNaam>('Inschrijven');
    huidigeStapIndex = computed(() => StapNamen.indexOf(this.huidigeStapNaam()));
    progressBarCompletedSteps = computed(() => StapNamen.map((_, stapIndex) => stapIndex <= this.huidigeStapIndex()));
    versturenError = signal<string | undefined>(undefined);
    verzendStatus = signal<VerzendStatus>(undefined);

    withBorderBottom = signal<boolean>(true);
    showStappen = signal<boolean>(true);
    isInschrijvenValid = computed(() => this.data().keuzes.length > 0 || this.data().wilGeenGesprek);
    magAanvragen = computed(() => isBefore(new Date(), this.info().ouderavond.aanvragenTot));
    isStatusAangevraagd = computed(() => this.info().inschrijfStatus === 'GESPREKKEN_AANGEVRAAGD');
    heeftGeenAanvullendeVelden = computed(
        () =>
            !this.info().isOpmerkingVoorRoostermakerToegestaan &&
            !this.info().heeftMeerdereLeerlingUitnodigingenVoorDezeOuderavond &&
            !this.info().ouderavond.extraLangGesprekToegestaan &&
            !this.info().ouderavond.opmerkingDocentToegestaan
    );

    ngOnInit(): void {
        const isAangevraagdGeenAfspraak = this.isStatusAangevraagd() && !this.info().heeftAfspraak;
        if (this.info().inschrijfStatus !== 'NOG_GEEN_REACTIE' || !this.magAanvragen()) this.showStappen.set(false);

        this.data.set({
            keuzes: this.info().afspraakVerzoeken.filter((verzoek) => verzoek.aangevraagd),
            opmerkingVoorRoostermaker: isAangevraagdGeenAfspraak ? this.info().opmerkingVoorRoostermaker : undefined,
            wilGeenGesprek: this.info().inschrijfStatus === 'GEEN_GESPREK'
        });

        this._resizeObserverService.observe(this._wizardContainerRef().nativeElement, () =>
            this.withBorderBottom.set(
                this._wizardContainerRef().nativeElement.scrollHeight <= this._wizardContainerRef().nativeElement.clientHeight
            )
        );
    }

    ngAfterViewInit(): void {
        this.withBorderBottom.set(
            this._wizardContainerRef().nativeElement.scrollHeight <= this._wizardContainerRef().nativeElement.clientHeight
        );
    }

    ngOnDestroy(): void {
        this._resizeObserverService.unobserve(this._wizardContainerRef().nativeElement);
    }

    isHuidigeStapValid = computed<boolean>(() => {
        switch (this.huidigeStapNaam()) {
            // de volgende stappen zijn optioneel of hebben geen input
            case 'Inschrijven':
                return this.isInschrijvenValid();
            case 'Informatie':
            case 'Samenvatting':
                return true;
        }
    });

    volgendeKnop = computed<NavigatieKnop | undefined>(() => {
        const isVersturenStap = this.huidigeStapNaam() === 'Samenvatting';
        return {
            disabled: !this.isHuidigeStapValid(),
            label: this.isHuidigeStapValid() ? (isVersturenStap ? 'Inschrijven' : 'Volgende') : 'Maak een keuze'
        };
    });

    vorigeKnop = computed<NavigatieKnop | undefined>(() => {
        if (this.huidigeStapNaam() === 'Inschrijven' || !this.showStappen()) {
            return;
        }
        return {
            disabled: this.verzendStatus() === 'In progress',
            label: 'Vorige'
        };
    });

    onEditNavigation(editWrapper: OuderavondEditWrapper) {
        this.huidigeStapNaam.set(editWrapper.stapNaam);

        if (editWrapper.keuzeId) {
            setTimeout(() => {
                const element = `#keuze-${editWrapper.keuzeId}`;
                this._elementRef.nativeElement.querySelector(element)?.scrollIntoView();
                if (this._accessibilityService.isAccessedByKeyboard()) {
                    this.focusOnElementById(element);
                }
            });
        }

        if (editWrapper.roosterMaker) {
            setTimeout(() => {
                const element = '#roostermaker';
                this._elementRef.nativeElement.querySelector(element)?.scrollIntoView();
                if (this._accessibilityService.isAccessedByKeyboard()) {
                    this.focusOnElementById(element);
                }
            });
        }
    }

    gaNaarStap(stapNaam: StapNaam) {
        if (this.verzendStatus() === 'In progress') return;
        this.huidigeStapNaam.set(stapNaam);

        if (this._accessibilityService.isAccessedByKeyboard()) {
            this.focusOnElementById(HuidigeStapId);
        }
    }

    volgende() {
        if (this.verzendStatus() === 'In progress') return;

        if (this.huidigeStapNaam() === 'Inschrijven') {
            const selectedIds = this.data().keuzes.map((keuze) => keuze.id);

            this.info().afspraakVerzoeken = this.info().afspraakVerzoeken.map((verzoek) =>
                selectedIds.includes(verzoek.id) ? verzoek : { ...verzoek, extraGesprekstijd: false, opmerkingVoorDocenten: undefined }
            );
        }

        const actie = this.volgendeKnop()?.label;
        if (actie === 'Inschrijven') {
            this.verzendStatus.set('In progress');
            this._ouderavondService
                .verwerkKeuzes(this.paramId(), this.data(), this.info())
                .pipe(
                    catchError((error) => {
                        return of(error);
                    })
                )
                .subscribe((result) => {
                    this.verzendStatus.set(undefined);
                    if (result instanceof HttpErrorResponse) {
                        this.onVersturenError();
                    } else {
                        this.onVersturenSuccess();
                    }
                });
        } else if (actie === 'Volgende') {
            this.gaNaarStap(
                this.data().wilGeenGesprek || this.heeftGeenAanvullendeVelden() ? 'Samenvatting' : StapNamen[this.huidigeStapIndex() + 1]
            );
        }
        this.scrollToTop();
    }

    vorige() {
        this.verzendStatus.set(undefined);

        const actie = this.vorigeKnop()?.label;
        if (actie === 'Vorige') {
            if (this.data().wilGeenGesprek || this.heeftGeenAanvullendeVelden()) this.gaNaarEersteStap();
            else this.gaNaarStap(StapNamen[this.huidigeStapIndex() - 1]);
        }
        this.scrollToTop();
    }

    wijzigen() {
        this.showStappen.set(true);
        this.verzendStatus.set(undefined);
        this.gaNaarEersteStap();
        this.scrollToTop();
    }

    private gaNaarEersteStap() {
        this.gaNaarStap(StapNamen[0]);
    }

    private onVersturenError(): void {
        this.verzendStatus.set('Error');
        if (this._accessibilityService.isAccessedByKeyboard()) {
            this.focusOnElementById('errorMessage');
        }
        this.scrollToTop();
    }

    private onVersturenSuccess(): void {
        this.verzendStatus.set('Succeeded');
        this.showStappen.set(false);
        if (this._accessibilityService.isAccessedByKeyboard()) {
            this.focusOnElementById('succesMessage');
        }
        this.scrollToTop();
    }

    private focusOnElementById(elementIdWithoutHash: string) {
        // schedule for next render tick
        setTimeout(() => this._elementRef.nativeElement.querySelector(`#${elementIdWithoutHash}`)?.focus());
    }

    private scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'instant'
        });
    }
}

type NavigatieKnopLabel = 'Maak een keuze' | 'Inschrijven' | 'Volgende' | 'Vorige';
type NavigatieKnop = Pick<SignalInputs<ButtonComponent>, 'label' | 'disabled'> & { label: NavigatieKnopLabel };

const StapNamen = ['Inschrijven', 'Informatie', 'Samenvatting'] as const;
export type StapNaam = (typeof StapNamen)[number];

const HuidigeStapId = 'huidige-stap';
