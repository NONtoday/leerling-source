import { ChangeDetectionStrategy, Component, computed, input, output, Signal } from '@angular/core';
import { subDays } from 'date-fns';
import { HmyDatePipe, IconDirective, IconPillComponent, isPresent, MessageBarComponent, MessageType } from 'harmony';
import { IconBewerken, IconKalenderDag, IconReactieToevoegen, provideIcons } from 'harmony-icons';
import { OuderavondInfo } from '../model/ouderavond.model';
import { OuderavondVakDocentComponent } from '../ouderavond-vak-docent/ouderavond-vak-docent.component';
import { OuderavondData, StapNaam, VerzendStatus } from '../ouderavond-wizard/ouderavond-wizard.component';

export interface OuderavondEditWrapper {
    stapNaam: StapNaam;
    keuzeId?: number;
    roosterMaker?: boolean;
}

interface ToastInfo {
    message: string;
    messageType: MessageType;
}
@Component({
    selector: 'sl-ouderavond-samenvatting',
    imports: [OuderavondVakDocentComponent, IconDirective, IconPillComponent, MessageBarComponent],
    providers: [provideIcons(IconBewerken, IconReactieToevoegen, IconKalenderDag)],
    templateUrl: './ouderavond-samenvatting.component.html',
    styleUrl: './ouderavond-samenvatting.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OuderavondSamenvattingComponent {
    private _datePipe = new HmyDatePipe();

    public ouderavondInfo = input.required<OuderavondInfo>();
    public data = input.required<OuderavondData>();
    public magAanvragen = input.required<boolean>();
    public isStatusAangevraagd = input.required<boolean>();
    public verzendStatus = input<VerzendStatus>();
    public showStappen = input<boolean>();

    public edit = output<OuderavondEditWrapper>();

    public extraLangGesprekToegestaan = computed(() => this.ouderavondInfo().ouderavond.extraLangGesprekToegestaan);
    public vakOpmerkingToegestaan = computed(() => this.ouderavondInfo().ouderavond.opmerkingDocentToegestaan);
    public roostermakerOpmerkingToegestaan = computed(() => this.ouderavondInfo().isOpmerkingVoorRoostermakerToegestaan);
    public title = computed(() => (this.ouderavondInfo().leerlingNaam ? 'Overzicht' : 'Samenvatting'));
    public titleSubtext = computed(
        () =>
            this.ouderavondInfo()
                .ouderavondDatums?.filter(isPresent)
                .map((datum) => this._datePipe.transform(datum, 'dagnummer_maand_lang_zonder_jaar').toLowerCase())
                .join(', ') ?? ''
    );

    public toastInfo: Signal<ToastInfo | undefined> = computed(() => {
        if (this.magAanvragen()) return undefined;

        if (this.ouderavondInfo().heeftAfspraak)
            return {
                message: 'Ouderavond ingepland. U heeft een e-mail ontvangen met de bevestiging van de afspraken.',
                messageType: 'success'
            };

        let message = `Inschrijfperiode is verlopen op <b>${this._datePipe.transform(subDays(this.ouderavondInfo().ouderavond.aanvragenTot, 1), 'dag_uitgeschreven_dagnummer_maand').toLowerCase()}</b>. `;
        if (this.ouderavondInfo().inschrijfStatus === 'GEEN_GESPREK') {
            message += 'U heeft aangegeven dat u geen gesprek wilt.';
            return { message: message, messageType: 'info' };
        } else {
            message += 'Het is niet meer mogelijk om in te schrijven.';
        }

        return { message: message, messageType: 'error' };
    });

    public verzendMessage = computed(() => {
        if (this.verzendStatus() === 'Succeeded') {
            return this.getSuccesMessage(new Date());
        } else if (this.verzendStatus() === 'Error') {
            return 'Inschrijving niet verzonden, probeer het nog een keer.';
        } else {
            return this.getSuccesMessage(this.ouderavondInfo().laatsteReactie);
        }
    });

    getSuccesMessage(date: Date | undefined): string {
        if (!date) return '';
        return `Inschrijving succesvol verstuurd op <b>${this._datePipe.transform(date, 'dagnummer_maand_lang_tijd_lowercase').toLowerCase()}</b>`;
    }
}
