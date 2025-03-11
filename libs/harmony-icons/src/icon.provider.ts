import { InjectionToken, Optional, Provider, SkipSelf } from '@angular/core';
import { isMap } from 'lodash-es';
import { Icon, IconName } from '../dist';

export function provideIcons(...newIcons: Icon[]): Provider[] {
    return [
        {
            provide: HARMONY_ICONS,
            useFactory: (registeredIcons?: Map<IconName, string>) => {
                if (!registeredIcons || !isMap(registeredIcons)) {
                    return new Map(newIcons.map((icon) => [icon.name, icon.data]));
                }
                newIcons.forEach((icon) => registeredIcons.set(icon.name, icon.data));

                return registeredIcons;
            },
            deps: [[HARMONY_ICONS, new Optional(), new SkipSelf()]],
            multi: false
        }
    ];
}

export const HARMONY_ICONS = new InjectionToken<Map<IconName, string>>('HarmonyIconsToken', {
    providedIn: 'root',
    factory: () => new Map()
});
