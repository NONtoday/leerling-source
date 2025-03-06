import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { CssVarPipe } from '../../css-var-pipe/css-var.pipe';
import { ColorToken } from '../../tokens/color-token';
import { getNotificationBgColor, getNotificationFgColor } from '../notification-utils';
import { NotificationColor } from '../notification.model';

@Component({
    selector: 'hmy-notification-solid',
    imports: [CommonModule, CssVarPipe],
    templateUrl: './notification-solid.component.html',
    styleUrls: ['../notification.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationSolidComponent implements OnInit {
    @Input() public color: NotificationColor = 'primary';
    @Input() public inverted = false;
    @Input() public size: 8 | 12 | 16 = 12;

    bgColor: ColorToken;
    iconColor: ColorToken;

    ngOnInit(): void {
        this.bgColor = getNotificationBgColor(this.color, this.inverted);
        this.iconColor = getNotificationFgColor(this.color, this.inverted);
    }
}
