import { ApplicationRef, InjectionToken, ViewContainerRef } from '@angular/core';

export const APP_VIEWCONTAINER_REF = new InjectionToken<ViewContainerRef>('app.viewcontainerRef');

/**
 *
 * @param containerRefName De naam van de viewcontainerref in app.component.ts
 */
export const appViewContainerRefProvider = (containerRefName = 'appViewContainerRef') => ({
    provide: APP_VIEWCONTAINER_REF,
    useFactory: (appRef: ApplicationRef) => appRef.components[0].instance[containerRefName] as ViewContainerRef,
    deps: [ApplicationRef]
});
