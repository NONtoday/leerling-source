import { IconName } from 'harmony-icons';
import { NotificationCounterInput, notificationCounterDefaults } from '../notification/notification-counter/notification-counter.model';
import { NotificationIconInput, notificationIconDefaults } from '../notification/notification-icon/notification-icon.model';
import { NotificationSolidInput, notificationSolidDefaults } from '../notification/notification-solid/notification-solid.model';

export interface TabInput {
    /**
     * Add additional HTML attributes to the tab element, useful for custom `data-` attributes.
     */
    additionalAttributes?: Record<string, string>;
    label: string;
    notification?: NotificationTabInput;
}

export type NotificationTabInput = NotificationCounterTabInput | NotificationIconTabInput | NotificationSolidTabInput;

/* NOTIFICATION: COUNTER */

export interface NotificationCounterTabInput extends NotificationCounterInput {
    count: number;
    countLabel?: string;
    type: 'counter';
}

export function createNotificationCounterTab(input: OptionalExcept<NotificationCounterTabInput, 'count'>): NotificationCounterTabInput {
    return { ...notificationCounterDefaults, ...input, type: 'counter' };
}

export function isNotificationCounterTab(notification?: NotificationTabInput): NotificationCounterTabInput | undefined {
    return notification?.type === 'counter' ? notification : undefined;
}

/* NOTIFICATION: ICON */

export interface NotificationIconTabInput extends NotificationIconInput {
    icon: IconName;
    type: 'icon';
}

export function createNotificationIconTab(input: OptionalExcept<NotificationIconTabInput, 'icon'>): NotificationIconTabInput {
    return { ...notificationIconDefaults, ...input, type: 'icon' };
}

export function isNotificationIconTab(notification?: NotificationTabInput): NotificationIconTabInput | undefined {
    return notification?.type === 'icon' ? notification : undefined;
}

/* NOTIFICATION: SOLID */

export interface NotificationSolidTabInput extends NotificationSolidInput {
    type: 'solid';
}

export function createNotificationSolidTab(input: Partial<NotificationSolidTabInput>): NotificationSolidTabInput {
    return { ...notificationSolidDefaults, ...input, type: 'solid' };
}

export function isNotificationSolidTab(notification?: NotificationTabInput): NotificationSolidTabInput | undefined {
    return notification?.type === 'solid' ? notification : undefined;
}

/**
 * For object-like <T>, make the properties in <RequiredKeys> required and all other properties optional.
 */
export type OptionalExcept<T extends object, RequiredKeys extends keyof T> = Required<Pick<T, RequiredKeys>> &
    Partial<Omit<T, RequiredKeys>>;
