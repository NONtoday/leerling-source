import { ElementRef, Injectable, TemplateRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { DeviceService, isPresent } from 'harmony';
import { Affiliation, AuthenticationService, SomtodayAccountProfiel, SomtodayLeerlingIngelogdAccount } from 'leerling-authentication';
import { isIOS } from 'leerling-util';
import { BehaviorSubject, Observable, Subject, combineLatest, distinctUntilChanged, filter, from, fromEvent, map, startWith } from 'rxjs';
import { HeaderComponent, HeaderViewModel } from '../header.component';

export interface ScrollableTitle {
    title: string;
    element: ElementRef;
}

@Injectable({
    providedIn: 'root'
})
export class HeaderService {
    private _deviceService = inject(DeviceService);
    private _authenticationService = inject(AuthenticationService);
    private _headerRefSubject = new BehaviorSubject<HeaderComponent | undefined>(undefined);
    private _backButtonClickedSubject = new Subject<void>();
    private _heeftBackButtonSubject = new BehaviorSubject<boolean>(false);
    private _scrollableTitle$: Observable<string | undefined>;
    private _titleElementRef$ = new BehaviorSubject<ElementRef | undefined>(undefined);

    public title$ = new BehaviorSubject<string | undefined>(undefined);
    public actionIcons = signal<TemplateRef<unknown> | undefined>(undefined);

    constructor() {
        const scroll$ = fromEvent(window, 'scroll').pipe(startWith(new Event('scroll')));
        this._scrollableTitle$ = combineLatest([this.title$, this._titleElementRef$, from(SafeArea.getSafeAreaInsets()), scroll$]).pipe(
            map(([title, elementRef, safeAreaInsets]) => {
                if (!title || !elementRef) return undefined;
                const rect = elementRef.nativeElement.getBoundingClientRect();
                let threshold = safeAreaInsets.insets.top;
                if (isIOS()) {
                    threshold += 20;
                }
                return title && rect.top <= threshold ? title : undefined;
            }),
            startWith(undefined),
            distinctUntilChanged()
        );

        combineLatest([this._titleElementRef$, fromEvent(window, 'scrollend')])
            .pipe(
                map(([titleElementRef]) => titleElementRef),
                filter(isPresent),
                map((titleElementRef) => titleElementRef.nativeElement.getBoundingClientRect()),
                filter((elementRect) => elementRect.top > 0),
                startWith(window.scrollY)
            )
            .subscribe((elementRect) => {
                const headerHeight = this._headerRefSubject.value?.elementRef.nativeElement.getBoundingClientRect().height;
                if (!headerHeight) return;

                const top = elementRect.top;
                const elementHeight = elementRect.height;
                const minToScrollUp = elementHeight / 2;

                if (top < headerHeight - minToScrollUp) {
                    window.scrollTo({
                        top: elementHeight,
                        behavior: 'smooth'
                    });
                } else if (top < elementHeight) {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            });

        combineLatest([this._headerRefSubject, this._titleElementRef$, this._deviceService.onDeviceChange$, scroll$])
            .pipe(
                filter(([headerRef]) => Boolean(headerRef)),
                takeUntilDestroyed()
            )
            .subscribe(([header, titleElementRef]) => {
                const transparent = !this._deviceService.isDesktop() && titleElementRef && window.scrollY === 0;
                header?.elementRef.nativeElement.style.setProperty(
                    '--border-color',
                    transparent ? 'transparent' : 'var(--border-neutral-normal)'
                );

                titleElementRef?.nativeElement.style.setProperty('opacity', `${1 / Math.max(1, window.scrollY / 5)}`);
            });
    }

    public get title() {
        return this.title$.value;
    }

    public set title(value: string | undefined) {
        this.title$.next(value);
    }

    public set titleElementRef(value: ElementRef) {
        this._titleElementRef$.next(value);
    }

    public set heeftBackButton(value: boolean) {
        this._heeftBackButtonSubject.next(value);
    }

    public set headerRef(value: HeaderComponent | undefined) {
        this._headerRefSubject.next(value);
    }

    public get backButtonClicked$(): Observable<void> {
        return this._backButtonClickedSubject.asObservable();
    }

    public backButtonClicked() {
        this._backButtonClickedSubject.next();
    }

    public getViewModel(): Observable<HeaderViewModel> {
        const authUserAvailable$ = this._authenticationService.beschikbareProfielen$.pipe(map((profielen) => profielen.length > 0));
        const accountProfile$: Observable<SomtodayAccountProfiel | undefined> = this._authenticationService.currentProfiel$;
        const currentAccountLeerling$: Observable<SomtodayLeerlingIngelogdAccount> = this._authenticationService.currentAccountLeerling$;
        const showActions$ = this._deviceService.isPhoneOrTabletPortrait$;
        return combineLatest([
            accountProfile$,
            authUserAvailable$,
            currentAccountLeerling$,
            this._scrollableTitle$,
            showActions$,
            this._heeftBackButtonSubject,
            this._deviceService.onDeviceChange$
        ]).pipe(
            map(([accountProfile, authUserAvailable, currentAccountLeerling, title, showActions, heeftBackButton]) => {
                const isDesktop = this._deviceService.isDesktop();
                const isVerzorger = Affiliation.PARENT_GUARDIAN === accountProfile?.affiliation;
                return {
                    showUserInfoWithAvatar: authUserAvailable,
                    showTabBar: isDesktop,
                    isVerzorger,
                    leerlingNaam: currentAccountLeerling.leerling?.nn,
                    initialen: currentAccountLeerling.leerling?.initialen,
                    organisatienaam: accountProfile?.schoolnaam,
                    avatarSrc: currentAccountLeerling.leerling?.avatarSrc,
                    title: title,
                    verbergLeerlingInfo: !isDesktop && Boolean(title),
                    showBackButton: !isDesktop && heeftBackButton,
                    showActions
                };
            })
        );
    }
}
