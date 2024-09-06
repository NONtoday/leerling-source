import { ElementRef, Injectable, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScreenReader } from '@capacitor/screen-reader';
import { DeviceService, shareReplayLastValue } from 'harmony';

import { BehaviorSubject, Observable, Subject, combineLatest, distinctUntilChanged, map, takeUntil, tap } from 'rxjs';
import { isWeb } from '../platform/platform';

export const CONTENT_TAB_INDEX = 100;

export const AVATAR_TAB_INDEX = 10;

type NavigationAction = 'KEYBOARD' | 'CLICK';

@Injectable({
    providedIn: 'root'
})
export class AccessibilityService {
    private _lastNavigationAction: NavigationAction = 'CLICK';

    private _deviceService = inject(DeviceService);
    private _homeTabindexDisabled = new BehaviorSubject<boolean>(false);
    private _screenreaderEnabled = signal(false);

    constructor() {
        combineLatest([this._deviceService.isTabletOrDesktop$, this._homeTabindexDisabled])
            .pipe(
                map(([tabletOrDesktop, tabIndexDisabled]) => tabletOrDesktop && tabIndexDisabled),
                distinctUntilChanged(),
                takeUntilDestroyed()
            )
            .subscribe((disabled) => {
                const homeComponent = document.querySelector('sl-home');
                if (homeComponent && homeComponent instanceof HTMLElement) {
                    homeComponent.setAttribute('aria-hidden', String(disabled));
                    homeComponent.inert = disabled;
                }
            });
        if (!isWeb()) {
            this.setScreenreader();
            ScreenReader.addListener('stateChange', ({ value }) => {
                this._screenreaderEnabled.set(value);
            });
        }
    }

    async setScreenreader() {
        const { value } = await ScreenReader.isEnabled();
        this._screenreaderEnabled.set(value);
    }

    /**
     * Indien er met toetsenbordnavigatie wordt gewerkt,
     * zet dit de focus op het element met de gegeven tabindex.
     * Dit wordt pas gedaan als de data aanwezig is - dit wordt gecheckt via de meegegeven isReadyFunction.
     *
     * De aanroepende code dient zelf de `destroy$` af te handelen.
     */
    public focusAfterLoad<T>(data$: Observable<T>, isReadyFunction: (data: T) => boolean, tabindex: number, destroy$: Subject<void>) {
        if (!this.isAccessedByKeyboard()) return;

        let focusInitialized = false;
        data$
            .pipe(
                shareReplayLastValue(),
                tap((data) => {
                    if (focusInitialized) return;
                    if (!isReadyFunction(data)) return;

                    setTimeout(() => {
                        this.focusElementWithTabIndex(tabindex);
                        focusInitialized = true;
                    });
                }),
                takeUntil(destroy$)
            )
            .subscribe();
    }

    /**
     * Zorgt dat de focus (onzichtbaar) op de header staat.
     * Als je dan na een actie/klik weer gaat 'tab'-en begin je weer vooraan in de lijst.
     */
    public resetFocusState(): void {
        const defaultFocusElement = document.querySelector('.default-focus');
        if (defaultFocusElement && defaultFocusElement instanceof HTMLElement) {
            defaultFocusElement.focus();
        }
    }

    public focusElementWithTabIndex(tabindex: number, parentElement?: ElementRef): boolean {
        const element = parentElement
            ? parentElement.nativeElement.querySelector(`[tabindex="${tabindex}"]`)
            : document.querySelector(`[tabindex="${tabindex}"]`);

        if (element && element instanceof HTMLElement) {
            element.focus();
            return true;
        } else {
            return false;
        }
    }

    /**
     * Zet de focus op het eerste component wat een tabindex > 100 (CONTENT_TAB_INDEX) heeft.
     * Zoekt daarbij het component waarbij het tabindex het dichtste bij de 100 zit.
     */
    public goToContent(parentElement?: ElementRef): void {
        // Is er iets met tabindex 100, dan selecteren we die en zijn we gelijk klaar.
        if (this.focusElementWithTabIndex(CONTENT_TAB_INDEX, parentElement)) return;

        const elementsWithTabindex = parentElement
            ? parentElement.nativeElement.querySelectorAll('[tabindex]')
            : document.querySelectorAll('[tabindex]');

        let firstContentElement: HTMLElement | undefined = undefined;
        for (let i = 0; i < elementsWithTabindex.length; i++) {
            const element = elementsWithTabindex.item(i);
            if (
                element instanceof HTMLElement &&
                element.tabIndex >= CONTENT_TAB_INDEX &&
                // Als we al een element gevonden hebben,
                // dan willen we die alleen bijwerken als de nieuw gevondene een lagere tabindex heeft.
                (firstContentElement === undefined || element.tabIndex < firstContentElement.tabIndex)
            ) {
                firstContentElement = element;
            }

            // Element exact tabindex '100'. Dan hebben we sowieso de 1e gevonden en zijn we klaar.
            if (firstContentElement?.tabIndex === CONTENT_TAB_INDEX) {
                break;
            }
        }
        if (firstContentElement) {
            firstContentElement.focus();
        }
    }

    public onKeyUp(e: KeyboardEvent) {
        if (e.key === 'Tab') {
            this._lastNavigationAction = 'KEYBOARD';
            return;
        }

        if (this.isActionEvent(e)) {
            const focussedElement = document.activeElement;
            if (focussedElement instanceof HTMLElement) {
                this._lastNavigationAction = 'KEYBOARD';

                // Maak een klik-event in het midden van het component
                const boundingClientRect = focussedElement.getBoundingClientRect();
                const centerButtonX = (boundingClientRect.left + boundingClientRect.right) / 2;
                const centerButtonY = (boundingClientRect.top + boundingClientRect.bottom) / 2;

                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: false,
                    cancelable: true,
                    screenX: centerButtonX,
                    screenY: centerButtonY,
                    clientX: centerButtonX,
                    clientY: centerButtonY
                });

                focussedElement.dispatchEvent(clickEvent);
            }
        }
    }

    /**
     * Verwijdert de focus van het actieve element.
     */
    public onClicked() {
        const focussedElement = document.activeElement;
        if (focussedElement instanceof HTMLInputElement || focussedElement instanceof HTMLTextAreaElement) return;

        if (focussedElement instanceof HTMLElement) {
            this._lastNavigationAction = 'CLICK';
            focussedElement.blur();
        }
    }

    public isActionEvent(event: KeyboardEvent) {
        return event.key === 'Enter' || event.key === ' ';
    }
    public isAccessedByKeyboard(): boolean {
        return this._lastNavigationAction === 'KEYBOARD';
    }

    public isAccessedByClick(): boolean {
        return this._lastNavigationAction === 'CLICK';
    }

    public disableHomeComponentTabIndex() {
        this._homeTabindexDisabled.next(true);
    }

    public enableHomeComponentTabIndex() {
        this._homeTabindexDisabled.next(false);
    }

    get isScreenReaderMobileEnabled(): WritableSignal<boolean> {
        return this._screenreaderEnabled;
    }

    /**
     * Bij keyboard navigatie kan het zijn dat de focus binnen het element staat.
     * Voor het dichtklappen van details wil je dan de focus weer op een parent element zetten.
     */
    public onKeyboardClickFocusParentThatMatches(matchingFunction: (element: HTMLElement) => boolean): void {
        if (this.isAccessedByKeyboard()) {
            const focusedElement = document.activeElement;
            if (focusedElement && focusedElement instanceof HTMLElement) {
                const matchingElement = this.findFirstParentThatMatches(focusedElement, matchingFunction);
                if (matchingElement) {
                    matchingElement.focus();
                }
            }
        }
    }

    public findFirstParentThatMatches(element: HTMLElement, matchingFunction: (element: HTMLElement) => boolean): HTMLElement | undefined {
        if (matchingFunction(element)) {
            return element;
        }

        // element nog niet gevonden, wellicht bij een parent?
        const parent = element.parentElement;
        if (!parent) {
            return undefined;
        }

        return this.findFirstParentThatMatches(parent, matchingFunction);
    }
}
