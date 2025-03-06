import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';
import { IconInformatie, IconName, IconNoRadio, IconWaarschuwing, IconYesRadio, provideIcons } from 'harmony-icons';
import { IconDirective } from '../icon/icon.directive';
import { ColorToken } from '../tokens/color-token';

export type MessageType = 'info' | 'error' | 'warning' | 'success';

@Component({
    selector: 'hmy-message-bar',
    imports: [CommonModule, IconDirective],
    templateUrl: './message-bar.component.html',
    styleUrl: './message-bar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconNoRadio, IconYesRadio, IconInformatie, IconWaarschuwing)],
    host: {
        '[class.success]': 'messageType() === "success"',
        '[class.error]': 'messageType() === "error"',
        '[class.info]': 'messageType() === "info"',
        '[class.warning]': 'messageType() === "warning"'
    }
})
export class MessageBarComponent {
    public message = input<string>('');
    public messageType = input.required<MessageType>();

    icon: Signal<IconName> = computed(() => {
        switch (this.messageType()) {
            case 'success':
                return 'yesRadio';
            case 'error':
                return 'noRadio';
            case 'info':
                return 'informatie';
            case 'warning':
                return 'waarschuwing';
            default:
                return 'yesRadio';
        }
    });

    iconColor: Signal<ColorToken> = computed(() => {
        switch (this.messageType()) {
            case 'success':
                return 'fg-on-positive-weak';
            case 'error':
                return 'fg-on-negative-weak';
            case 'info':
                return 'fg-on-primary-weak';
            case 'warning':
                return 'fg-on-warning-weak';
            default:
                return 'fg-on-positive-weak';
        }
    });
}
