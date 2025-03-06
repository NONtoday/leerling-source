import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { IconChevronOnder, IconName, provideIcons } from 'harmony-icons';
import { IconDirective, IconSize } from '../../icon/icon.directive';
import { BasePillComponent } from '../base-pill.component';

@Component({
    selector: 'hmy-icon-pill',
    imports: [CommonModule, IconDirective],
    templateUrl: './icon-pill.component.html',
    styleUrls: ['../base-pill.scss', './icon-pill.component.scss'],
    providers: [provideIcons(IconChevronOnder)],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconPillComponent extends BasePillComponent {
    @Input({ required: true }) public icon: IconName;
    @Input() @HostBinding('class.reversed') public reversed = false;
    @Input() public iconSize: IconSize = 'small';
    @Input() public iconOpacity = 1;
    @Input() public iconVisible = true;
    @Input() public withCounter = false;
    @Input() public count: number;
    @Input() public iconOnly = false;
}
