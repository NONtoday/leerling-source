import { DestroyRef, assertInInjectionContext, inject } from '@angular/core';
import { AuthenticationService, ContextSwitchRequestInterceptor } from 'leerling-authentication';

export function registerContextSwitchInterceptor(interceptor: ContextSwitchRequestInterceptor) {
    assertInInjectionContext(registerContextSwitchInterceptor);

    const authService = inject(AuthenticationService);
    const destroyRef = inject(DestroyRef);

    authService.setContextSwitchRequestInterceptor(interceptor);
    destroyRef.onDestroy(() => authService.removeContextSwitchRequestInterceptor());
}
