import { DestroyRef, Injector, Signal, TemplateRef, assertInInjectionContext, effect, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Device, DeviceService, desktopQuery, phoneQuery, tabletOrLowerQuery, tabletPortraitOrLowerQuery } from 'harmony';
import { match } from 'ts-pattern';
import { HeaderService } from './service/header.service';

interface HeaderConfig {
    onBackButtonClick: () => void;
    title?: string;
    maxDeviceWithBackButton?: Device;
    headerActions?: Signal<TemplateRef<any> | undefined>;
    injector?: Injector;
}

export function injectHeaderConfig(config: HeaderConfig) {
    if (!config.injector) {
        assertInInjectionContext(injectHeaderConfig);
    }
    const injector = config.injector ?? inject(Injector);
    const deviceService = injector.get(DeviceService);
    const headerService = injector.get(HeaderService);
    const destroyRef = injector.get(DestroyRef);

    const huidigeTitel = headerService.title;
    if (config.title) {
        headerService.title = config.title;
    }
    if (config.headerActions) {
        effect(() => untracked(() => headerService.actionIcons.set(config.headerActions?.())), { injector });
    }

    const query = match(config.maxDeviceWithBackButton ?? 'tabletPortrait')
        .with('desktop', () => desktopQuery)
        .with('tabletPortrait', () => tabletPortraitOrLowerQuery)
        .with('tablet', () => tabletOrLowerQuery)
        .with('phone', () => phoneQuery)
        .exhaustive();

    deviceService.onDeviceChange$
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe(() => (headerService.heeftBackButton = window.matchMedia(query).matches));
    headerService.backButtonClicked$.pipe(takeUntilDestroyed(destroyRef)).subscribe(config.onBackButtonClick);
    destroyRef.onDestroy(() => {
        headerService.actionIcons.set(undefined);
        headerService.title = huidigeTitel;
        headerService.heeftBackButton = false;
    });
}
