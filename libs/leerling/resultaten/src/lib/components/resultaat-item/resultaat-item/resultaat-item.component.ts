import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconDirective, TooltipDirective, VakIconComponent } from 'harmony';
import { IconDeeltoets, IconHerkansing, IconReacties, provideIcons } from 'harmony-icons';
import { ResultaatItem } from '../resultaat-item-model';
import { ResultaatItemAriaLabelPipe } from './resultaat-item-aria-label.pipe';

@Component({
    selector: 'sl-resultaat-item',
    imports: [CommonModule, IconDirective, TooltipDirective, ResultaatItemAriaLabelPipe, VakIconComponent],
    templateUrl: './resultaat-item.component.html',
    styleUrls: ['./resultaat-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconDeeltoets, IconHerkansing, IconReacties)],
    host: { '[class.ellipsis]': 'ellipsis()' }
})
export class ResultaatItemComponent {
    public resultaatItem = input.required<ResultaatItem>();
    public toonVakIcon = input<boolean>(true);
    public ellipsis = input<boolean>(true);

    public tooltip = computed(() => {
        if (this.resultaatItem().isVoldoende === 'neutraal') {
            if (this.resultaatItem().resultaat === '*') {
                return 'Toets niet gemaakt';
            } else if (this.resultaatItem().resultaat === 'vr') {
                return 'Vrijstelling';
            } else if (this.resultaatItem().resultaat === '') {
                return undefined;
            } else {
                return 'Telt niet mee als cijfer';
            }
        }

        return null;
    });

    public heeftEenTeTonenOpmerking = computed(() => {
        const resultaatItem = this.resultaatItem();
        if (resultaatItem.details?.opmerking) return !!resultaatItem.details.opmerking;
        return !resultaatItem.resultaat || resultaatItem.resultaat === '-'
            ? this.resultaatItem()?.details?.pogingen?.find((poging) => poging.opmerking != undefined)?.opmerking !== undefined
            : false;
    });
}
