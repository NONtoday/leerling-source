import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconDirective } from 'harmony';
import { IconName } from 'harmony-icons';
import { AppStatusService } from 'leerling-app-status';

@Component({
    selector: 'sl-header-action-button',
    standalone: true,
    imports: [IconDirective],
    templateUrl: './header-action-button.component.html',
    styleUrl: './header-action-button.component.scss',
    host: {
        '[class.hidden]': 'hidden()',
        role: 'button'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderActionButtonComponent {
    counter = input<number>(0);
    iconName = input.required<IconName>();
    hideWhenOffline = input.required<boolean>();
    label = input.required<string>();

    isOnline = inject(AppStatusService).isOnlineSignal();

    hidden = computed(() => this.hideWhenOffline() && !this.isOnline());
    disabled = input<boolean>(false);
}
