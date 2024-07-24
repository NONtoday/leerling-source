import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, WritableSignal, inject, signal } from '@angular/core';
import { DeviceService } from 'harmony';
import { AccessibilityService, ModalService } from 'leerling-util';
import { SGeldendResultaat } from 'leerling/store';
import { ToetsResultaat, VakExamendossier } from '../../../services/vakresultaten/vakresultaten-model';
import { ResultaatItemDetailComponent } from '../../resultaat-item/resultaat-item-detail/resultaat-item-detail.component';
import { ResultaatItem } from '../../resultaat-item/resultaat-item-model';
import { ResultaatItemAriaLabelPipe } from '../../resultaat-item/resultaat-item/resultaat-item-aria-label.pipe';
import { ResultaatItemComponent } from '../../resultaat-item/resultaat-item/resultaat-item.component';
import { ToResultaatItemPipe } from '../to-resultaat-item.pipe';
import { ToetssoortgemiddeldeItemComponent } from '../toetssoortgemiddelde-item/toetssoortgemiddelde-item.component';
import { VAKRESULTAAT_ITEM_DETAIL_COMPONENT_SELECTOR, VakresultaatItemComponent } from '../vakresultaat-item/vakresultaat-item.component';

@Component({
    selector: 'sl-examenresultaten',
    standalone: true,
    imports: [
        CommonModule,
        ResultaatItemComponent,
        ToResultaatItemPipe,
        VakresultaatItemComponent,
        ToetssoortgemiddeldeItemComponent,
        ResultaatItemAriaLabelPipe
    ],
    templateUrl: './examenresultaten.component.html',
    styleUrls: ['./examenresultaten.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExamenresultatenComponent {
    private _deviceService = inject(DeviceService);
    private _modalService = inject(ModalService);
    private _accessibilityService = inject(AccessibilityService);

    @Input({ required: true }) examendossier: VakExamendossier;

    public selectedResultaat: WritableSignal<ToetsResultaat<SGeldendResultaat> | undefined> = signal(undefined);

    public toonDetails(resultaatItem: ResultaatItem | undefined, toetsResultaat: ToetsResultaat<SGeldendResultaat>) {
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
