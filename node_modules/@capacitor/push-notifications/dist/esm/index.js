import { registerPlugin } from '@capacitor/core';
const PushNotifications = registerPlugin('PushNotifications', {});
export * from './definitions';
export { PushNotifications };
