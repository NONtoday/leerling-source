import { InjectionToken } from '@angular/core';

export interface SomtodayApiConfig {
    apiUrl: string;
}

export const SOMTODAY_API_CONFIG = new InjectionToken<SomtodayApiConfig>('SomtodayApiConfig');
