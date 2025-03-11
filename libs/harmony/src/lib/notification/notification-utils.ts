import { ColorToken } from '../tokens/color-token';
import { NotificationColor } from './notification.model';

export function getNotificationBgColor(color: NotificationColor, inverted: boolean): ColorToken {
    if (color === 'neutral') {
        return inverted ? 'fg-neutral-moderate' : 'fg-neutral-strong';
    } else {
        return inverted ? `bg-${color}-weak` : `bg-${color}-normal`;
    }
}

export function getNotificationFgColor(color: NotificationColor, inverted: boolean): ColorToken {
    if (color === 'neutral') {
        return inverted ? 'fg-on-neutral-moderate' : 'fg-on-neutral-strong';
    } else {
        return inverted ? `fg-on-${color}-weak` : `fg-on-${color}-normal`;
    }
}
