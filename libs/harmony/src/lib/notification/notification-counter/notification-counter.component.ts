import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CssVarPipe, toCssVar } from '../../css-var-pipe/css-var.pipe';

import { getNotificationBgColor, getNotificationFgColor } from '../notification-utils';
import { NotificationCounterBorder, notificationCounterDefaults } from './notification-counter.model';

@Component({
    selector: 'hmy-notification-counter',
    imports: [CommonModule, CssVarPipe],
    templateUrl: './notification-counter.component.html',
    styleUrls: ['../notification.scss', './notification-counter.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationCounterComponent {
    count = input.required<number>();
    color = input(notificationCounterDefaults.color);
    inverted = input(notificationCounterDefaults.inverted);
    size = input(notificationCounterDefaults.size);
    border = input<NotificationCounterBorder>();
    countLabel = input<string>();

    bgColor = computed(() => getNotificationBgColor(this.color(), this.inverted()));
    fgColor = computed(() => getNotificationFgColor(this.color(), this.inverted()));
    isLargeNumber = computed(() => this.count() > 9);
    width = computed(() => (this.isLargeNumber() ? 'max-content' : `${this.size()}px`));
    ariaLabel = computed(() => (this.countLabel() ? `${this.count()} ${this.countLabel()}` : undefined));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    borderColor = computed(() => (this.border() ? toCssVar(this.border()!.color) : undefined));
}
