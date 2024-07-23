import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, WritableSignal, inject, signal } from '@angular/core';
import { DeviceService, SpinnerComponent } from 'harmony';
import { RouterService } from 'leerling-base';
import { AccessibilityService, GeenDataComponent, ModalService, onRefresh } from 'leerling-util';
import { Observable } from 'rxjs';
import { CijfersService } from '../../../services/cijfers/cijfers.service';
import { LaatsteResultaat } from '../../../services/laatsteresultaten/laatsteresultaten-model';
import { LaatsteResultatenService } from '../../../services/laatsteresultaten/laatsteresultaten.service';
import { ResultaatItemDetailComponent } from '../../resultaat-item/resultaat-item-detail/resultaat-item-detail.component';
import { ResultaatItem } from '../../resultaat-item/resultaat-item-model';
import { VakResultaatTab } from '../../vakresultaten/vakresultaten/vakresultaten.component';
import {
    LAATSTE_RESULTAAT_ITEM_COMPONENT_SELECTOR,
    LaatsteResultaatItemComponent
} from '../laatste-resultaat-item/laatste-resultaat-item.component';
import { ToResultaatItemPipe } from './to-resultaat-item.pipe';

@Component({
    selector: 'sl-laatsteresultaten',
    standalone: true,
    imports: [CommonModule, LaatsteResultaatItemComponent, GeenDataComponent, SpinnerComponent, ToResultaatItemPipe],
    templateUrl: './laatsteresultaten.component.html',
    styleUrls: ['./laatsteresultaten.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LaatsteresultatenComponent implements OnDestroy {
    private _laatsteResultatenService = inject(LaatsteResultatenService);
    private _deviceService = inject(DeviceService);
    private _modalService = inject(ModalService);
    private _cijfersService = inject(CijfersService);
    private _routerService = inject(RouterService);
    private _accessibilityService = inject(AccessibilityService);

    public laatsteResultaten$: Observable<LaatsteResultaat[] | undefined> = this._laatsteResultatenService.getLaatsteResultaten();
    public selectedResultaat: WritableSignal<LaatsteResultaat | undefined> = signal(undefined);

    constructor() {
        this._cijfersService.setCijfersMetTabs();

        onRefresh(() => this._laatsteResultatenService.refreshLaatsteResultaten());
    }

    ngOnDestroy(): void {
        this._cijfersService.reset();
    }

    public toonDetails(resultaatItem: ResultaatItem | undefined, laatsteResultaat: LaatsteResultaat) {
        if (resultaatItem === undefined) {
            this.selectedResultaat.set(undefined);
            return;
        }

        if (laatsteResultaat === this.selectedResultaat()) {
            this.selectedResultaat.set(undefined);
            this._accessibilityService.onKeyboardClickFocusParentThatMatches(
                (element) => element.tagName.toUpperCase() === LAATSTE_RESULTAAT_ITEM_COMPONENT_SELECTOR.toUpperCase()
            );
        } else if (this._deviceService.isPhoneOrTabletPortrait()) {
            this.selectedResultaat.set(undefined);

            const detailComponent = this._modalService.modal(
                ResultaatItemDetailComponent,
                {
                    resultaatItem: resultaatItem,
                    toonVakCijferlijstKnop: true,
                    toonTitel: true,
                    toonVakIcon: true
                },
                ResultaatItemDetailComponent.getModalSettings()
            );
            detailComponent.openVakCijferlijst.subscribe(() => {
                this.openVakCijferlijst(laatsteResultaat);
            });
        } else {
            this.selectedResultaat.set(laatsteResultaat);
        }
    }

    openVakCijferlijst(laatsteResultaat: LaatsteResultaat) {
        const geldendResultaat = laatsteResultaat.geldendResultaten[0];
        let actieveTab: VakResultaatTab = 'Rapport';
        if (geldendResultaat.dossierType == 'Examen') {
            actieveTab = 'Examen';
        } else if (laatsteResultaat.isAlternatief) {
            actieveTab = 'Alternatief';
        }
        this._routerService.routeToCijfersVakresultaten(geldendResultaat.vakUuid, geldendResultaat.lichtingUuid, undefined, actieveTab);
    }
}
