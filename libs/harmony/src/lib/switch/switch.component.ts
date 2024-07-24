import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { IconName } from 'harmony-icons';
import { IconDirective } from '../icon/icon.directive';
import { Optional } from '../optional/optional';

@Component({
    selector: 'hmy-switch',
    standalone: true,
    imports: [CommonModule, IconDirective],
    templateUrl: './switch.component.html',
    styleUrls: ['./switch.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SwitchComponent {
    @Input({ required: true }) label: string;
    @Input() icon: Optional<IconName>;
    @HostBinding('class.active') @Input() active = false;
    @HostBinding('class.disabled') @Input() disabled = false;
}
