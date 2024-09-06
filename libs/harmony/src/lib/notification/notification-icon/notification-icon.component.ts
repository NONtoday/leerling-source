import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { IconName } from 'harmony-icons';
import { CssVarPipe } from '../../css-var-pipe/css-var.pipe';
import { IconDirective } from '../../icon/icon.directive';
import { ColorToken } from '../../tokens/color-token';
import { getNotificationBgColor, getNotificationFgColor } from '../notification-utils';
import { NotificationColor } from '../notification.model';
import { NotificationIconSize, notificationIconDefaults } from './notification-icon.model';

@Component({
    selector: 'hmy-notification-icon',
    standalone: true,
    imports: [CommonModule, CssVarPipe, IconDirective],
    templateUrl: './notification-icon.component.html',
    styleUrls: ['../notification.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationIconComponent implements OnInit {
    @Input({ required: true }) public icon: IconName;
    @Input() public color: NotificationColor = notificationIconDefaults.color;
    @Input() public inverted = notificationIconDefaults.inverted;
    @Input() public size: NotificationIconSize = notificationIconDefaults.size;

    bgColor: ColorToken;
    iconColor: ColorToken;
    iconSizePx: number;

    ngOnInit(): void {
        this.bgColor = getNotificationBgColor(this.color, this.inverted);
        this.iconColor = getNotificationFgColor(this.color, this.inverted);
        this.iconSizePx = this.getIconSize();
    }

    private getIconSize(): number {
        switch (this.size) {
            case 16:
                return 9.6;
            case 20:
                return 12;
            case 24:
                return 16;
        }
    }
}
