import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { shareReplayLastValue } from '../operators/shareReplayLastValue.operator';

export const phoneQuery = '(max-width: 479px)';
export const tabletQuery = '(min-width: 768px) and (max-width: 1279px)';
export const tabletPortraitQuery = '(min-width: 480px) and (max-width: 767px)';
export const desktopQuery = '(min-width: 1280px)';

export const tabletOrLowerQuery = '(max-width: 1279px)';
export const tabletPortraitOrLowerQuery = '(max-width: 767px)';

export type Device = 'phone' | 'tabletPortrait' | 'tablet' | 'desktop';

@Injectable({
    providedIn: 'root'
})
export class DeviceService {
    private mediaQueryDesktop: MediaQueryList = window.matchMedia(desktopQuery);
    private mediaQueryTabletPortrait: MediaQueryList = window.matchMedia(tabletPortraitQuery);
    private mediaQueryTablet: MediaQueryList = window.matchMedia(tabletQuery);
    private mediaQueryPhone: MediaQueryList = window.matchMedia(phoneQuery);

    onDeviceChange$ = inject(BreakpointObserver)
        .observe([desktopQuery, tabletQuery, tabletPortraitQuery, phoneQuery])
        .pipe(
            startWith({
                breakpoints: {
                    [phoneQuery]: this.isPhone(),
                    [tabletPortraitQuery]: this.isTabletPortrait(),
                    [tabletQuery]: this.isTablet(),
                    [desktopQuery]: this.isDesktop()
                },
                matches: true
            }),
            shareReplayLastValue()
        );

    isTabletOrDesktop$ = this.onDeviceChange$.pipe(
        map((state) => state.breakpoints[tabletQuery] || state.breakpoints[desktopQuery]),
        distinctUntilChanged()
    );
    isDesktop$ = this.onDeviceChange$.pipe(
        map((state) => state.breakpoints[desktopQuery]),
        distinctUntilChanged()
    );

    isPhoneOrTablet$ = this.onDeviceChange$.pipe(
        map((state) => state.breakpoints[phoneQuery] || state.breakpoints[tabletPortraitQuery] || state.breakpoints[tabletQuery]),
        startWith(this.isPhoneOrTablet()),
        shareReplayLastValue()
    );
    isPhoneOrTabletPortrait$ = this.onDeviceChange$.pipe(
        map((state) => state.breakpoints[phoneQuery] || state.breakpoints[tabletPortraitQuery]),
        startWith(this.isPhoneOrTabletPortrait()),
        shareReplayLastValue()
    );
    isTabletPortrait$ = this.onDeviceChange$.pipe(
        map((state) => state.breakpoints[tabletPortraitQuery]),
        startWith(this.isTabletPortrait()),
        shareReplayLastValue()
    );
    isPhone$ = this.onDeviceChange$.pipe(
        map((state) => state.breakpoints[phoneQuery]),
        startWith(this.isPhone()),
        shareReplayLastValue()
    );

    isTablet$ = this.onDeviceChange$.pipe(
        map((state) => state.breakpoints[tabletQuery]),
        startWith(this.isTablet()),
        shareReplayLastValue()
    );

    isPhoneSignal = toSignal(this.isPhone$, { initialValue: this.isPhone() });
    isPhoneOrTabletPortraitSignal = toSignal(this.isPhoneOrTabletPortrait$, { initialValue: this.isPhoneOrTabletPortrait() });
    isTabletSignal = toSignal(this.isTablet$, { initialValue: this.isTablet() });
    isTabletOrDesktopSignal = toSignal(this.isTabletOrDesktop$, { initialValue: this.isTabletOrDesktop() });
    isDesktopSignal = toSignal(this.isDesktop$, { initialValue: this.isDesktop() });
    isPhoneOrTabletSignal = toSignal(this.isPhoneOrTablet$, { initialValue: this.isPhoneOrTablet() });

    currentDevice = toSignal<Device>(
        this.onDeviceChange$.pipe(
            map((state) =>
                state.breakpoints[phoneQuery]
                    ? 'phone'
                    : state.breakpoints[tabletPortraitQuery]
                      ? 'tabletPortrait'
                      : state.breakpoints[tabletQuery]
                        ? 'tablet'
                        : 'desktop'
            )
        ),
        { requireSync: true }
    );

    public isPhone(): boolean {
        return this.mediaQueryPhone.matches;
    }

    public isTabletPortrait(): boolean {
        return this.mediaQueryTabletPortrait.matches;
    }

    public isTablet(): boolean {
        return this.mediaQueryTablet.matches;
    }

    public isDesktop(): boolean {
        return this.mediaQueryDesktop.matches;
    }

    public isPhoneOrTabletPortrait(): boolean {
        return this.isPhone() || this.isTabletPortrait();
    }

    public isPhoneOrTablet(): boolean {
        return this.isPhone() || this.isTabletPortrait() || this.isTablet();
    }

    public isTabletOrDesktop(): boolean {
        return this.isTablet() || this.isDesktop();
    }

    public isTabletPortraitOrTablet(): boolean {
        return this.isTabletPortrait() || this.isTablet();
    }

    public isTouch(): boolean {
        return this.isPhone() || this.isTabletPortraitOrTablet();
    }
}
