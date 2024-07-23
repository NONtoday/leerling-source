import { ColorToken } from '../tokens/color-token';
import { NotificationColor } from './notification.model';

export function getNotificationBgColor(color: NotificationColor, inverted: boolean): ColorToken {
    if (color === 'neutral') {
        return inverted ? 'bg-neutral-weak' : 'bg-neutral-max';
    } else {
        return inverted ? `bg-${color}-weak` : `bg-${color}-normal`;
    }
}

export function getNotificationFgColor(color: NotificationColor, inverted: boolean): ColorToken {
    if (color === 'neutral') {
        return inverted ? 'fg-on-neutral-weak' : 'fg-on-neutral-max';
    } else {
        return inverted ? `fg-on-${color}-weak` : `fg-on-${color}-normal`;
    }
}
