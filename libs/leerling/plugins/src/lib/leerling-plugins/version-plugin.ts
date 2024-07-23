import { registerPlugin } from '@capacitor/core';

export interface AppVersionResponse {
    version: string;
}

export interface AppVersionPlugin {
    getAppVersion(): Promise<{ version: string }>;
}

export const AppVersion = registerPlugin<AppVersionPlugin>('AppVersion');
