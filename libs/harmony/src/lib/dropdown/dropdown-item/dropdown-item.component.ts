import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconCheck, provideIcons } from 'harmony-icons';
import { IconDirective } from '../../icon/icon.directive';
import { DropdownItem } from '../dropdown.model';

@Component({
    selector: 'hmy-dropdown-item',
    host: {
        role: 'option',
        '[class.selected]': 'selected()',
        '[class.disabled]': 'item().disabled',
        '[attr.aria-selected]': 'selected()',
        '[attr.aria-disabled]': 'item().disabled'
    },
    standalone: true,
    imports: [CommonModule, IconDirective],
    providers: [provideIcons(IconCheck)],
    templateUrl: './dropdown-item.component.html',
    styleUrl: './dropdown-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownItemComponent<T> {
    public item = input.required<DropdownItem<T>>();
    public selected = input<boolean>(false);
}
