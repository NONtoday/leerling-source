import { NotificationBaseInput } from '../notification.model';

export type NotificationIconSize = 16 | 20 | 24;

export interface NotificationIconInput extends NotificationBaseInput {
    size: NotificationIconSize;
}

export const notificationIconDefaults: Readonly<NotificationIconInput> = {
    color: 'primary',
    inverted: false,
    size: 20
};
