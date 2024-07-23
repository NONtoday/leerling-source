import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { HuiswerkTypen } from './huiswerk-typen.pipe';

export type DotSize = 'normal' | 'small' | 'smallest';

@Component({
    selector: 'sl-werkdruk-indicator',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './werkdruk-indicator.component.html',
    styleUrl: './werkdruk-indicator.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WerkdrukIndicatorComponent {
    @Input({ required: true }) public huiswerkTypen: HuiswerkTypen;
    @Input() public size: DotSize = 'normal';
}
