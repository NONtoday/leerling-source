/* eslint-disable @typescript-eslint/no-empty-function */
import { AfterViewInit, Directive, ElementRef, HostListener, Renderer2, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addDays, subDays } from 'date-fns';
import { valtBinnenHuidigeSchooljaar } from 'leerling/store';
import { filter } from 'rxjs';
import { ElementRefProvider } from '../element-ref-provider';
import { KeyPressedService } from '../keypressed/keypressed.service';
import { ISwipable, SwipeDirection, SwipeInfo } from '../swipe/swipable.interface';
import { SwipeManager } from '../swipe/swipe.manager';
import { Direction } from './direction';

type PanelPosition = 'left' | 'center' | 'right';

// Dit is de waardie die in de css transform staat, bij aanpassingen beide wijzigen.
const ANIMATION_DURATION = 220;

/**
 * Component wat drie elementen naast elkaar rendert waarvan één in beeld.
 *    - Left  : vorige element (in tijd), staat links buiten beeld gerenderd
 *    - Center: huidig element, wordt getoond wordt aan de gebruiker
 *    - Right : volgend element (in tijd), staat rechts buiten beeld gerenderd
 *
 * Bij een next of previous event worden de posities aangepast van element aangepast,
 * zodat één component opnieuw gerenderd hoeft te worden wat een flikkereffect voorkomt.
 *
 * Voorbeeld van next event:
 *    - Left  : verplaatst zonder animatie naar 'right', was vorig element en wordt volgend element (wordt opnieuw opgebouwd)
 *    - Center: verplaatst geanimeerd naar 'left', was huidig element en wordt vorig element (onaangepast)
 *    - Right : verplaatst geanimeerd naar 'center', was volgend element en wordt huidig element (onaangepast)
 *
 *
 * Voorbeeld van previous event:
 *    - Left  : verplaatst geanimeerd naar 'center', was vorig element en wordt huidig element (onaangepast)
 *    - Center: verplaatst geanimeerd naar 'right', was huidig element en wordt volgend element (onaangepast)
 *    - Right : verplaatst zonder animatie naar 'left', was volgend element en wordt vorig element (wordt opnieuw opgebouwd)
 */
@Directive()
export abstract class AbstractDrieluikComponent<T extends ElementRefProvider> implements AfterViewInit, ISwipable {
    public peildatum = input.required<Date>();

    public allowKeyEvents = input(true);
    public peildatumChange = output<Date>();

    private _isAnimating = false;
    private directions: SwipeDirection[] = ['left', 'right'];
    private _swipeManager = new SwipeManager(this, 30);
    private _keyPressedService = inject(KeyPressedService);

    protected _renderer = inject(Renderer2);
    private _hostElementRef = inject(ElementRef);

    constructor() {
        this.getAantalSwipeDagen();
        this._keyPressedService.mainKeyboardEvent$
            .pipe(
                filter(() => this.allowKeyEvents()),
                takeUntilDestroyed()
            )
            .subscribe((event) => this.handleKeyEvent(event));
    }

    onCancelSwipe(): void {
        this.setSwipingState(undefined);
        this.setAnimating();

        // Zet alles weer op zijn plek.
        // Eerst alles netjes terugschuiven, met een mooie move
        this.getElements().forEach((element) => {
            this.setTransition(element, 'enabled');
        });
        this.moveElement('left', -100);
        this.moveElement('right', 100);

        // Na het schuiven de transitie eraf halen - want als de panels geshuffeld worden gooit de transitie alles in de soep.
        setTimeout(() => {
            this.resetMoveElement('left');
            this.resetMoveElement('center');
            this.resetMoveElement('right');
        }, ANIMATION_DURATION);
    }

    onSuccessfullSwipe(percentageSwiped: number): void {
        this.setSwipingState(undefined);

        if (percentageSwiped < 0) {
            this.next();
        } else {
            this.previous();
        }

        // Zet alles weer op zijn plek.
        // Eerst alles netjes terugschuiven
        this.moveElement('left', -100);
        this.moveElement('center', 0);
        this.moveElement('right', 100);

        // Na het schuiven de transitie eraf halen - want als de panels geshuffeld worden gooit de transitie alles in de soep.
        setTimeout(() => {
            this.resetMoveElement('left');
            this.resetMoveElement('center');
            this.resetMoveElement('right');
        }, ANIMATION_DURATION);
    }

    onSwipeStart(): void {
        this.setSwipingState('swiping');
    }

    private setSwipingState(state: 'swiping' | undefined) {
        const nativeElement = this._hostElementRef.nativeElement;
        if (state) {
            nativeElement.dataset.state = state;
        } else {
            nativeElement.removeAttribute('data-state');
        }
    }

    private resetMoveElement(elementPosition: PanelPosition) {
        const element = this.getElement(elementPosition);
        if (element) {
            this._renderer.removeStyle(element.elementRef.nativeElement, 'transform');
        }
    }

    private moveElement(elementPosition: PanelPosition, percentage: number) {
        const element = this.getElement(elementPosition);
        if (element) {
            const nativeElement = element.elementRef.nativeElement;
            this._renderer.setStyle(nativeElement, 'transform', `translate3d(${percentage}%, 0, 0)`);
        }
    }

    onSwiping(percentageSwiped: number): void {
        // de items die buiten beeld staan moeten ook mee bewegen.
        this.moveElement('left', -100 + percentageSwiped);
        this.moveElement('right', 100 + percentageSwiped);
    }

    getSwipeInfo(): SwipeInfo {
        return {
            // We swipen altijd 1 component: het middelste component.
            swipableElement: (this.getElement('center') ?? this.getElements()[1]).elementRef,
            swipeDirection: this.directions,
            pixelsMovedToSuccessfullSwipe: 36
        };
    }

    ngAfterViewInit(): void {
        this.initState();
    }

    private getElement(position: PanelPosition): T | undefined {
        return this.getElements().find((element) => element.elementRef.nativeElement.dataset.position === position);
    }

    @HostListener('touchstart', ['$event'])
    private _onTouchStart(event: TouchEvent) {
        this.directions = this.getAllowedSwipeDirections();
        this._swipeManager.onTouchStart(event);
    }

    @HostListener('touchmove', ['$event'])
    private _onTouchMove(event: TouchEvent) {
        this._swipeManager.onTouchMove(event);
    }

    @HostListener('touchend', ['$event'])
    private onTouchEnd(event: TouchEvent) {
        this._swipeManager.onTouchEnd(event);
    }

    private initState() {
        const positions = ['left', 'center', 'right'];
        this.getElements().forEach((element, index) => {
            element.elementRef.nativeElement.dataset.position = positions[index];
            this.setTransition(element, 'disabled');
        });
    }

    private setAnimating() {
        this._hostElementRef.nativeElement.dataset.state = 'animating';
        this._isAnimating = true;
        setTimeout(() => {
            this._hostElementRef.nativeElement.removeAttribute('data-state');
            this._isAnimating = false;
        }, ANIMATION_DURATION);
    }

    private setTransition(element: T, transition: 'disabled' | 'enabled') {
        element.elementRef.nativeElement.dataset.transition = transition;
    }

    private disableAccessibility(nativeElement: any) {
        if (nativeElement instanceof HTMLElement) {
            nativeElement.inert = true;
            nativeElement.setAttribute('aria-hidden', 'true');
        }
    }

    private enableAccessibility(nativeElement: any) {
        if (nativeElement instanceof HTMLElement) {
            nativeElement.inert = false;
            nativeElement.removeAttribute('aria-hidden');
        }
    }

    public next() {
        if (this._isAnimating || this.isNextNavigationDisabled()) return;

        this.setAnimating();
        this.getElements().forEach((element) => {
            const position = element.elementRef.nativeElement.dataset.position;
            switch (position) {
                case 'left': {
                    this.setTransition(element, 'disabled');
                    element.elementRef.nativeElement.dataset.position = 'right';
                    this.disableAccessibility(element.elementRef.nativeElement);
                    break;
                }
                case 'center': {
                    this.setTransition(element, 'enabled');
                    element.elementRef.nativeElement.dataset.position = 'left';
                    this.disableAccessibility(element.elementRef.nativeElement);
                    break;
                }
                case 'right': {
                    this.setTransition(element, 'enabled');
                    element.elementRef.nativeElement.dataset.position = 'center';
                    this.enableAccessibility(element.elementRef.nativeElement);
                    break;
                }
            }
        });

        this.onNavigation('next');
    }

    public previous() {
        if (this._isAnimating || this.isPreviousNavigationDisabled()) return;

        this.setAnimating();
        this.getElements().forEach((element) => {
            const position = element.elementRef.nativeElement.dataset.position;
            switch (position) {
                case 'left': {
                    this.setTransition(element, 'enabled');
                    element.elementRef.nativeElement.dataset.position = 'center';
                    this.enableAccessibility(element.elementRef.nativeElement);
                    break;
                }
                case 'center': {
                    this.setTransition(element, 'enabled');
                    element.elementRef.nativeElement.dataset.position = 'right';
                    this.disableAccessibility(element.elementRef.nativeElement);
                    break;
                }
                case 'right': {
                    this.setTransition(element, 'disabled');
                    element.elementRef.nativeElement.dataset.position = 'left';
                    this.disableAccessibility(element.elementRef.nativeElement);
                    break;
                }
            }
        });

        this.onNavigation('previous');
    }

    private handleKeyEvent(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            event.stopPropagation();
            this.previous();
            this.afterKeyboardArrowNavigation();
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            this.next();
            this.afterKeyboardArrowNavigation();
        }
    }

    protected afterKeyboardArrowNavigation(): void {}

    public getAllowedSwipeDirections(): SwipeDirection[] {
        const swipeDirections: SwipeDirection[] = [];
        const targetDateTerugInSchooljaar = valtBinnenHuidigeSchooljaar(subDays(this.peildatum(), this.getAantalSwipeDagen()));
        const targetDateVooruitInSchooljaar = valtBinnenHuidigeSchooljaar(addDays(this.peildatum(), this.getAantalSwipeDagen()));

        if (targetDateTerugInSchooljaar) swipeDirections.push('right');
        if (targetDateVooruitInSchooljaar) swipeDirections.push('left');

        return swipeDirections;
    }

    public abstract getElements(): T[];
    public abstract onNavigation(direction: Direction): void;
    public abstract getAantalSwipeDagen(): number;
    public abstract isPreviousNavigationDisabled(): boolean;
    public abstract isNextNavigationDisabled(): boolean;
}
