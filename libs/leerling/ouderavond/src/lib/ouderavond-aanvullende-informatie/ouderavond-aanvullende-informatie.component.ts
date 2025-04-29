import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HmyDatePipe, IconDirective, isPresent, MessageBarComponent, ToggleComponent } from 'harmony';
import { IconKlok, provideIcons } from 'harmony-icons';
import { OuderavondInfo } from '../model/ouderavond.model';
import { OuderavondVakDocentComponent } from '../ouderavond-vak-docent/ouderavond-vak-docent.component';
import { OuderavondData } from '../ouderavond-wizard/ouderavond-wizard.component';

@Component({
    selector: 'sl-ouderavond-aanvullende-informatie',
    imports: [CommonModule, IconDirective, OuderavondVakDocentComponent, ToggleComponent, FormsModule, MessageBarComponent],
    providers: [provideIcons(IconKlok)],
    templateUrl: './ouderavond-aanvullende-informatie.component.html',
    styleUrl: './ouderavond-aanvullende-informatie.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OuderavondAanvullendeInformatieComponent {
    private _datePipe = new HmyDatePipe();

    public data = model.required<OuderavondData>();
    public ouderavondInfo = input.required<OuderavondInfo>();

    public titleSubtext = computed(
        () =>
            this.ouderavondInfo()
                .ouderavondDatums?.filter(isPresent)
                .map((datum) => this._datePipe.transform(datum, 'dagnummer_maand_lang_zonder_jaar').toLowerCase())
                .join(', ') ?? ''
    );
}
