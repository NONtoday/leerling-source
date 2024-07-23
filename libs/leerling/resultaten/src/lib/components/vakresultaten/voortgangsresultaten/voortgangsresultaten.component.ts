import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, WritableSignal, inject, signal } from '@angular/core';
import { DeviceService, IconDirective, StripHTMLPipe, TooltipDirective } from 'harmony';
import { IconReacties, provideIcons } from 'harmony-icons';
import { AccessibilityService, ModalService } from 'leerling-util';
import { SGeldendVoortgangsdossierResultaat } from 'leerling/store';
import { ToetsResultaat, VoortgangsNiveau } from '../../../services/vakresultaten/vakresultaten-model';
import { ResultaatItemDetailComponent } from '../../resultaat-item/resultaat-item-detail/resultaat-item-detail.component';
import { ResultaatItem } from '../../resultaat-item/resultaat-item-model';
import { ResultaatItemAriaLabelPipe } from '../../resultaat-item/resultaat-item/resultaat-item-aria-label.pipe';
import { ResultaatItemComponent } from '../../resultaat-item/resultaat-item/resultaat-item.component';
import { ToResultaatItemPipe } from '../to-resultaat-item.pipe';
import { VAKRESULTAAT_ITEM_DETAIL_COMPONENT_SELECTOR, VakresultaatItemComponent } from '../vakresultaat-item/vakresultaat-item.component';
import { RapportCijferAriaLabelPipe } from './rapportCijferTooltip.pipe';

@Component({
    selector: 'sl-voortgangsresultaten',
    standalone: true,
    templateUrl: './voortgangsresultaten.component.html',
    styleUrls: ['./voortgangsresultaten.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconReacties)],
    imports: [
        CommonModule,
        TooltipDirective,
        ResultaatItemComponent,
        ToResultaatItemPipe,
        VakresultaatItemComponent,
        IconDirective,
        ResultaatItemDetailComponent,
        ResultaatItemAriaLabelPipe,
        ToResultaatItemPipe,
        StripHTMLPipe,
        RapportCijferAriaLabelPipe
    ]
})
export class VoortgangsresultatenComponent implements OnChanges {
    private _deviceService = inject(DeviceService);
    private _modalService = inject(ModalService);
    private _accessibilityService = inject(AccessibilityService);

    @Input({ required: true }) public voortgangsdossier: VoortgangsNiveau;
    @Input({ required: true }) public isAlternatiefNiveau: boolean;

    public periodeNummers: number[];

    public selectedResultaat: WritableSignal<ToetsResultaat<SGeldendVoortgangsdossierResultaat> | undefined> = signal(undefined);

    ngOnChanges(): void {
        if (this.voortgangsdossier) {
            this.periodeNummers = (Object.keys(this.voortgangsdossier.perioden) as unknown as number[]).sort((a, b) => b - a);
        }
    }

    public toonDetails(resultaatItem: ResultaatItem | undefined, toetsResultaat: ToetsResultaat<SGeldendVoortgangsdossierResultaat>) {
        if (resultaatItem === undefined) {
            this.selectedResultaat.set(undefined);
            return;
        }

        if (toetsResultaat === this.selectedResultaat()) {
            this.selectedResultaat.set(undefined);
            this._accessibilityService.onKeyboardClickFocusParentThatMatches(
                (element) => element.tagName.toUpperCase() === VAKRESULTAAT_ITEM_DETAIL_COMPONENT_SELECTOR.toUpperCase()
            );
        } else if (this._deviceService.isPhoneOrTabletPortrait()) {
            this.selectedResultaat.set(undefined);
            this._modalService.modal(
                ResultaatItemDetailComponent,
                {
                    resultaatItem: resultaatItem,
                    toonVakCijferlijstKnop: false,
                    toonTitel: true,
                    toonVakIcon: false
                },
                ResultaatItemDetailComponent.getModalSettings()
            );
        } else {
            this.selectedResultaat.set(toetsResultaat);
        }
    }
}
