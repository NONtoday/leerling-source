import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ToHuiswerkTypenPipe } from '../../werkdruk-indicator/huiswerk-typen.pipe';
import { WerkdrukIndicatorComponent } from '../../werkdruk-indicator/werkdruk-indicator.component';
import { DayDateTab } from '../dag-header/dag-header.component';

@Component({
    selector: 'sl-dag-header-tab',
    imports: [CommonModule, WerkdrukIndicatorComponent, ToHuiswerkTypenPipe],
    templateUrl: './dag-header-tab.component.html',
    styleUrls: ['./dag-header-tab.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DagHeaderTabComponent {
    @Input({ required: true }) public datum: DayDateTab;
}
