import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, model, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { subDays } from 'date-fns';
import { DeviceService, HmyDatePipe, IconDirective, IconPillComponent, MessageBarComponent, ToggleComponent } from 'harmony';
import { IconInformatie, IconKalenderDag, provideIcons } from 'harmony-icons';
import { SlContainsPipe } from 'leerling-util';
import { AfspraakVerzoek, OuderavondInfo } from '../model/ouderavond.model';
import { OuderavondKeuzeComponent } from '../ouderavond-keuze/ouderavond-keuze.component';
import { OuderavondData } from '../ouderavond-wizard/ouderavond-wizard.component';

@Component({
    selector: 'sl-ouderavond-inschrijven',
    imports: [
        CommonModule,
        FormsModule,
        IconPillComponent,
        ToggleComponent,
        IconDirective,
        OuderavondKeuzeComponent,
        SlContainsPipe,
        MessageBarComponent
    ],
    providers: [provideIcons(IconKalenderDag, IconInformatie)],
    templateUrl: './ouderavond-inschrijven.component.html',
    styleUrl: './ouderavond-inschrijven.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OuderavondInschrijvenComponent {
    private ouderavondKeuzes = viewChildren(OuderavondKeuzeComponent);
    private _datePipe = new HmyDatePipe();

    private _deviceService = inject(DeviceService);

    public ouderavondInfo = input.required<OuderavondInfo>();
    public magAanvragen = input.required<boolean>();

    public data = model.required<OuderavondData>();

    isTabletOrDesktop = this._deviceService.isTabletOrDesktopSignal;

    keuzes = computed(() => this.ouderavondInfo().afspraakVerzoeken);
    maxAantalGesprekken = computed(() => this.ouderavondInfo().ouderavond.maxAantalGesprekken);
    eindDatumAanvragen = computed(() => this.ouderavondInfo().ouderavond.aanvragenTot);
    datums = computed(() => this.ouderavondInfo().ouderavondDatums);
    activeKeuzes = computed(() => this.ouderavondKeuzes()?.filter((keuze) => keuze.isChecked()) || []);
    isInschrijvenDisabled = computed(() => this.data().wilGeenGesprek || this.activeKeuzes().length >= this.maxAantalGesprekken());
    eindDatumText = computed(
        () =>
            `Inschrijven t/m ${this._datePipe.transform(subDays(this.eindDatumAanvragen(), 1), 'dag_uitgeschreven_dagnummer_maand').toLowerCase()}`
    );
    onbeperktAantalGesprekken = computed(() => this.maxAantalGesprekken() === this.keuzes().length);
    eindDatumTextAriaLabel = computed(
        () =>
            `Inschrijven tot en met ${this._datePipe.transform(subDays(this.eindDatumAanvragen(), 1), 'dag_uitgeschreven_dagnummer_maand').toLowerCase()}`
    );
    titleSubtext = computed(() =>
        this.datums()
            .map((datum) => this._datePipe.transform(datum, 'dagnummer_maand_lang_zonder_jaar').toLowerCase())
            .join(', ')
    );
    toggleText = computed(
        () => `Met welke docenten wil je een gesprek? (${this.isTabletOrDesktop() ? 'maximaal' : 'max'} ${this.maxAantalGesprekken()})`
    );

    updateData(keuze: AfspraakVerzoek, isChecked: boolean): void {
        const data = this.data();
        this.data.set({
            ...data,
            keuzes: isChecked ? [...data.keuzes, keuze] : data.keuzes.filter((k) => k !== keuze)
        });
    }

    toggleWilGeenGesprek() {
        this.data.set({
            keuzes: [],
            opmerkingVoorRoostermaker: undefined,
            wilGeenGesprek: !this.data().wilGeenGesprek
        });
        this.deselectAllCheckboxes();
    }

    deselectAllCheckboxes(): void {
        this.ouderavondKeuzes()?.forEach((keuze) => {
            keuze.isChecked.set(false);
        });
    }

    keuzeAriaLabel(keuze: AfspraakVerzoek, isChecked: boolean): string {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        return `${keuze.vak}, docenten: ${keuze.docenten}, ${isChecked ? 'geselecteerd' : 'niet geselecteerd'}`;
    }
}
