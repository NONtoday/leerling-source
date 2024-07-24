import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconDirective } from '../icon/icon.directive';
import { BasePillComponent } from './base-pill.component';

@Component({
    selector: 'hmy-pill',
    standalone: true,
    imports: [CommonModule, IconDirective],
    template: `<span [innerHTML]="text"></span>
        @if (metChevron) {
            <i [color]="getIconColor()" size="smallest" hmyIcon="chevronOnder"></i>
        }`,
    styleUrls: ['./base-pill.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PillComponent extends BasePillComponent {}
