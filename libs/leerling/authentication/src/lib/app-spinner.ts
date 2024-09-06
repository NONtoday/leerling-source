import { InjectionToken, WritableSignal, signal } from '@angular/core';

export const APP_SPINNER = new InjectionToken<WritableSignal<boolean>>('AppSpinner', {
    providedIn: 'root',
    factory: () => signal(false)
});
