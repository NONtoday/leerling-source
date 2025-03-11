import { registerPlugin } from '@capacitor/core';

export interface GenerateResponseType {
    android?: string;
    iOS?: {
        keyId: string;
        attestation: string;
    };
}

export interface AppCheckTokenPlugin {
    getToken(options: { input: string }): Promise<GenerateResponseType>;
}

export const AppCheckToken = registerPlugin<AppCheckTokenPlugin>('AppCheckToken');
