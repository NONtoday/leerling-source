/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { Capacitor } from '@capacitor/core';

export enum SupportedPlatforms {
    WEB = 'web',
    IOS = 'ios',
    ANDROID = 'android'
}

export const isWeb = () => Capacitor.getPlatform() === SupportedPlatforms.WEB;

export const isIOS = () => Capacitor.getPlatform() === SupportedPlatforms.IOS;

export const isAndroid = () => Capacitor.getPlatform() === SupportedPlatforms.ANDROID;
