import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconDirective, TooltipDirective, VakIconComponent } from 'harmony';
import { IconDeeltoets, IconHerkansing, IconReacties, provideIcons } from 'harmony-icons';
import { ResultaatItem } from '../resultaat-item-model';
import { ResultaatItemAriaLabelPipe } from './resultaat-item-aria-label.pipe';

@Component({
    selector: 'sl-resultaat-item',
    standalone: true,
    imports: [CommonModule, IconDirective, TooltipDirective, ResultaatItemAriaLabelPipe, VakIconComponent],
    templateUrl: './resultaat-item.component.html',
    styleUrls: ['./resultaat-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconDeeltoets, IconHerkansing, IconReacties)]
})
export class ResultaatItemComponent {
    public resultaatItem = input.required<ResultaatItem>();
    public toonVakIcon = input<boolean>(true);

    public tooltip(): string | null {
        if (this.resultaatItem().isVoldoende === 'neutraal') {
            if (this.resultaatItem().resultaat === '*') {
                return 'Toets niet gemaakt';
            } else if (this.resultaatItem().resultaat === 'vr') {
                return 'Vrijstelling';
            } else {
                return 'Telt niet mee als cijfer';
            }
        }

        return null;
    }
}
