import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, OnDestroy, signal, WritableSignal } from '@angular/core';
import { DeviceService, GeenDataComponent, SpinnerComponent } from 'harmony';
import { CIJFERS, CIJFERS_RESULTAATITEM, RouterService } from 'leerling-base';
import { AccessibilityService, ModalService, onRefresh } from 'leerling-util';
import { derivedAsync } from 'ngxtension/derived-async';
import { injectQueryParams } from 'ngxtension/inject-query-params';
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
    imports: [CommonModule, LaatsteResultaatItemComponent, GeenDataComponent, SpinnerComponent],
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

    private paramResultaatItemString = injectQueryParams(CIJFERS_RESULTAATITEM);

    public laatsteResultaten = derivedAsync<LaatsteResultaat[] | undefined>(() => this._laatsteResultatenService.getLaatsteResultaten());
    public selectedResultaat: WritableSignal<LaatsteResultaat | undefined> = signal(undefined);

    public paramResultaatItem = derivedAsync(() => {
        const itemStringId = this.paramResultaatItemString();

        if (!itemStringId || this._deviceService.isDesktop()) return undefined;

        const itemId = Number(itemStringId);
        return this._laatsteResultatenService.getLaatsteResultaatItem(itemId);
    });

    private isResultaatItemOpen = signal(false);

    constructor() {
        this._cijfersService.setCijfersMetTabs();

        effect(() => {
            const laatsteResultaat = this.paramResultaatItem();

            if (this.isResultaatItemOpen() || !this.paramResultaatItemString() || !laatsteResultaat) return;

            const resultaatItem = new ToResultaatItemPipe().transform(laatsteResultaat);
            this.toonDetails(resultaatItem, laatsteResultaat, true);
        });

        onRefresh(() => this._laatsteResultatenService.refreshLaatsteResultaten());
    }

    ngOnDestroy(): void {
        this._cijfersService.reset();
    }

    public toonDetails(resultaatItem: ResultaatItem | undefined, laatsteResultaat: LaatsteResultaat, hasBookmarkableUrl: boolean) {
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

            this.openResultaatItemDetail(resultaatItem, laatsteResultaat, hasBookmarkableUrl);
        } else {
            this.selectedResultaat.set(laatsteResultaat);
        }
    }

    openResultaatItemDetail(resultaatItem: ResultaatItem, laatsteResultaat: LaatsteResultaat, hasBookmarkableUrl: boolean) {
        const detailComponent = this._modalService.modal(
            ResultaatItemDetailComponent,
            {
                resultaatItem: resultaatItem,
                toonVakCijferlijstKnop: true,
                toonTitel: true,
                toonVakIcon: true,
                toonKolommen: false
            },
            {
                ...ResultaatItemDetailComponent.getModalSettings(),
                hasBookmarkableUrl: hasBookmarkableUrl,
                onClose: () => {
                    setTimeout(() => {
                        // timeout is nodig om te voorkomen dat de modal weer opent.
                        this.isResultaatItemOpen.set(false);
                    }, 300);
                },
                returnURL: CIJFERS
            }
        );
        this.isResultaatItemOpen.set(true);
        detailComponent.openVakCijferlijst.subscribe(() => {
            this.openVakCijferlijst(laatsteResultaat);
        });
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
