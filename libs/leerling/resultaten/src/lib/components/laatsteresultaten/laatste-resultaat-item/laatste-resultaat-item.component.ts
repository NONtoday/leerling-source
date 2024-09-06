import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject, output } from '@angular/core';
import { collapseOnLeaveAnimation, expandOnEnterAnimation } from 'angular-animations';
import { DeviceService, IconDirective } from 'harmony';
import { Observable } from 'rxjs';
import { LaatsteResultaat } from '../../../services/laatsteresultaten/laatsteresultaten-model';
import { AbstractResultaatMetDetailsComponent } from '../../abstract-resultaat-met-details.component';
import { ResultaatItemDetailComponent } from '../../resultaat-item/resultaat-item-detail/resultaat-item-detail.component';
import { ResultaatItem } from '../../resultaat-item/resultaat-item-model';
import { ResultaatItemComponent } from '../../resultaat-item/resultaat-item/resultaat-item.component';
import { ToResultaatItemPipe } from '../laatsteresultaten/to-resultaat-item.pipe';

const ANIMATIONS = [expandOnEnterAnimation(), collapseOnLeaveAnimation()];

export const LAATSTE_RESULTAAT_ITEM_COMPONENT_SELECTOR = 'sl-laatste-resultaat-item';

@Component({
    selector: LAATSTE_RESULTAAT_ITEM_COMPONENT_SELECTOR,
    standalone: true,
    imports: [CommonModule, IconDirective, ResultaatItemComponent, ResultaatItemDetailComponent, ToResultaatItemPipe],
    templateUrl: './laatste-resultaat-item.component.html',
    styleUrls: ['../../abstract-resultaat-met-details.component.scss', './laatste-resultaat-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: ANIMATIONS
})
export class LaatsteResultaatItemComponent extends AbstractResultaatMetDetailsComponent {
    @Input({ required: true }) laatsteResultaat: LaatsteResultaat;

    openVakCijferlijst = output<void>();

    public isTabletOrDesktop$: Observable<boolean> = inject(DeviceService).isTabletOrDesktop$;

    provideResultaatItem(): ResultaatItem {
        return new ToResultaatItemPipe().transform(this.laatsteResultaat);
    }
}
