import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { IconDirective } from 'harmony';
import { IconCheck, provideIcons } from 'harmony-icons';
import { DropdownItem } from '../dropdown.component';

@Component({
    selector: 'sl-dropdown-item',
    imports: [CommonModule, IconDirective],
    templateUrl: './dropdown-item.component.html',
    styleUrls: ['./dropdown-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconCheck)]
})
export class DropdownItemComponent<T> {
    @Input() dropdownItem: DropdownItem<T>;
    @Input() @HostBinding('class.active') active = false;
}
