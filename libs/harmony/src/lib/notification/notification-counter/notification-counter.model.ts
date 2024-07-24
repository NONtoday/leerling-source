import { ColorToken } from '../../tokens/color-token';
import { NotificationBaseInput } from '../notification.model';

export type NotificationCounterSize = 14 | 16 | 20 | 24;

export interface NotificationCounterInput extends NotificationBaseInput {
    size: NotificationCounterSize;
}

export const notificationCounterDefaults: Readonly<NotificationCounterInput> = {
    color: 'primary',
    inverted: false,
    size: 20
};

export interface NotificationCounterBorder {
    size: number;
    color: ColorToken;
}
