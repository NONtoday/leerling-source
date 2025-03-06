import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { SpinnerComponent } from 'harmony';
import { DropdownComponent, DropdownConfig, DropdownItem, onRefresh } from 'leerling-util';
import { valtBinnenHuidigeSchooljaar } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { CijferoverzichtService } from '../../services/cijferoverzicht/cijferoverzicht.service';
import { PlaatsingEnExamenData, PlaatsingEnExamenItem } from '../../services/cijferoverzicht/plaatsing-en-examen-item-selectors';
import { CijfersService } from '../../services/cijfers/cijfers.service';
import { CijferOverzichtExamenComponent } from '../cijfer-overzicht-examen/cijfer-overzicht-examen.component';
import { CijferOverzichtVoortgangComponent } from '../cijfer-overzicht-voortgang/cijfer-overzicht-voortgang.component';

const DROPDOWN_CONFIG: DropdownConfig<PlaatsingEnExamenData> = {
    getDefaultItemFn: (items: DropdownItem<PlaatsingEnExamenData>[]) => {
        const itemsInDitSchooljaar = items.filter((item) => valtBinnenHuidigeSchooljaar(new Date(item.data.eindschooljaar, 6, 1)));
        if (itemsInDitSchooljaar.length === 0) return undefined;

        return itemsInDitSchooljaar[0];
    }
};
@Component({
    selector: 'sl-cijfer-overzicht',
    standalone: true,
    imports: [CommonModule, CijferOverzichtVoortgangComponent, CijferOverzichtExamenComponent, SpinnerComponent, DropdownComponent],
    templateUrl: './cijfer-overzicht.component.html',
    styleUrls: ['./cijfer-overzicht.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CijferOverzichtComponent implements OnDestroy {
    private _cijfersService = inject(CijfersService);
    private _cijferoverzichtService = inject(CijferoverzichtService);

    public plaatsingenEnExamens = derivedAsync(() => this._cijferoverzichtService.getPlaatsingEnExamenItems());
    public geselecteerdePlaatsingEnExamen = signal<PlaatsingEnExamenItem | undefined>(undefined);

    public dropdownconfig = DROPDOWN_CONFIG;

    constructor() {
        this._cijfersService.setCijfersMetTabs();
        onRefresh(() => this._cijferoverzichtService.refreshPlaatsingEnExamenItems());
    }

    public ngOnDestroy(): void {
        this._cijfersService.reset();
    }
}
