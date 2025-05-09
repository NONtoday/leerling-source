import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { collapseOnLeaveAnimation, expandOnEnterAnimation } from 'angular-animations';

import { SGeldendResultaat } from 'leerling/store';
import { ToetsResultaat } from '../../../services/vakresultaten/vakresultaten-model';
import { AbstractResultaatMetDetailsComponent } from '../../abstract-resultaat-met-details.component';

import { ResultaatItemDetailComponent } from '../../resultaat-item/resultaat-item-detail/resultaat-item-detail.component';
import { ResultaatItem } from '../../resultaat-item/resultaat-item-model';
import { ResultaatItemComponent } from '../../resultaat-item/resultaat-item/resultaat-item.component';
import { ToResultaatItemPipe } from '../to-resultaat-item.pipe';

const ANIMATIONS = [collapseOnLeaveAnimation(), expandOnEnterAnimation()];

export const VAKRESULTAAT_ITEM_DETAIL_COMPONENT_SELECTOR = 'sl-vakresultaat-item';

@Component({
    selector: VAKRESULTAAT_ITEM_DETAIL_COMPONENT_SELECTOR,
    imports: [CommonModule, ResultaatItemComponent, ResultaatItemDetailComponent],
    templateUrl: './vakresultaat-item.component.html',
    styleUrls: ['../../abstract-resultaat-met-details.component.scss', './vakresultaat-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: ANIMATIONS
})
export class VakresultaatItemComponent<T extends SGeldendResultaat> extends AbstractResultaatMetDetailsComponent implements OnChanges {
    @Input({ required: true }) resultaat: ToetsResultaat<T>;
    @Input({ required: true }) isAlternatiefNiveau: boolean;
    @Input({ required: true }) toonKolommen: boolean;

    override provideResultaatItem(): ResultaatItem {
        return new ToResultaatItemPipe().transform(this.resultaat, this.isAlternatiefNiveau);
    }
}
