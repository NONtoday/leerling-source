import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconDirective } from 'harmony';
import { IconChevronOnder, provideIcons } from 'harmony-icons';

@Component({
    selector: 'sl-bericht-seperator',
    imports: [CommonModule, IconDirective],
    templateUrl: './bericht-seperator.component.html',
    styleUrl: './bericht-seperator.component.scss',
    host: {
        '[class.clickable]': 'clickable()',
        '[attr.role]': 'role()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronOnder)]
})
export class BerichtSeperatorComponent {
    label = input.required<string>();
    clickable = input<boolean>(false);
    expanded = input<boolean>();

    role = computed(() => (this.clickable() ? 'button' : null));
}
