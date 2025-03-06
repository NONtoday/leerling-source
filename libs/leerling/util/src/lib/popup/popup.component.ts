import { AUTO_STYLE, animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
    AfterContentChecked,
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    HostBinding,
    HostListener,
    Input,
    OnDestroy,
    OnInit,
    Renderer2,
    ViewContainerRef,
    inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { Subject, filter, fromEvent, map, takeUntil } from 'rxjs';
import { AccessibilityService } from '../accessibility/accessibility.service';
import { KeyPressedService } from '../keypressed/keypressed.service';
import { PopupSettings } from './popup-settings';
import { BoundingClientRect, MouseLocationElement } from './popup.modals';
import { PopupPositionService } from './service/popup-position.service';
import { PopupService } from './service/popup.service';

const POPUP_ANIMATION = trigger('popupAnimation', [
    transition('void => fade-visible', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('150ms ease-in', style({ opacity: 1, transform: 'scale(1)' }))
    ]),
    state('fade-visible', style({ opacity: 1, transform: 'scale(1)' })),
    state('fade-hidden', style({ opacity: 0, transform: 'scale(0.8)' })),
    transition('fade-visible => fade-hidden', [animate('150ms ease-out')]),

    transition('void => slide-visible', [
        style({ height: 0, overflow: 'hidden' }),
        animate('350ms cubic-bezier(0.17, 0.89, 0.24, 1)', style({ height: AUTO_STYLE }))
    ]),
    state('slide-visible', style({ height: AUTO_STYLE })),
    state('slide-hidden', style({ height: 0 })),
    transition('slide-visible => slide-hidden', [animate('250ms ease-out')])
]);

type AnimationState = 'fade-visible' | 'fade-hidden' | 'slide-visible' | 'slide-hidden';

const ANIMATIONS = [POPUP_ANIMATION];

const POPUP_SELECTOR = 'sl-popup';

@Component({
    selector: POPUP_SELECTOR,
    imports: [CommonModule],
    templateUrl: './popup.component.html',
    styleUrls: ['./popup.component.scss'],
    animations: ANIMATIONS,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopupComponent implements OnInit, AfterContentChecked, AfterViewInit, OnDestroy {
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _popupService = inject(PopupService);
    private _popupPositionService = inject(PopupPositionService);
    private _router = inject(Router);
    private _accessibilityService = inject(AccessibilityService);
    private _keyPressedService = inject(KeyPressedService);
    private _renderer = inject(Renderer2);

    public viewContainerRef = inject(ViewContainerRef);

    @HostBinding('style.top') top: string;
    @HostBinding('style.left') left: string;
    @HostBinding('style.width') width: string;
    @HostBinding('style.height') height: string;

    @HostBinding('@popupAnimation') private _animationState: AnimationState | undefined = undefined;

    @Input() uuid: string;
    @Input() settings: PopupSettings;
    @Input() connectedElement: ViewContainerRef;

    private _destroy$ = new Subject<void>();

    constructor() {
        this._router.events
            .pipe(
                filter((event) => event instanceof NavigationStart && !this.settings.keepOnNavigation),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                this.close();
            });
        this._keyPressedService.mainKeyboardEvent$.pipe(takeUntilDestroyed()).subscribe((event) => this.handleKeyEvent(event));
    }

    private handleKeyEvent(event: KeyboardEvent) {
        if (event.key === 'Escape') this.handleEscapeKey();
    }

    private handleEscapeKey(): void {
        if (!(document.activeElement instanceof HTMLElement)) return;

        const popupItemSelected =
            this._accessibilityService.findFirstParentThatMatches(
                document.activeElement,
                (element) => element.tagName.toUpperCase() === POPUP_SELECTOR.toUpperCase()
            ) === this.viewContainerRef.element.nativeElement;

        const connectedElementSelected = document.activeElement === this.connectedElement.element.nativeElement;

        if (popupItemSelected || connectedElementSelected) {
            this.animateAndClose();
            this.connectedElement.element.nativeElement.focus();
        }
    }

    ngOnInit() {
        const nativeElement = this.viewContainerRef.element.nativeElement;
        nativeElement.style.setProperty('--overflow', 'hidden');
        nativeElement.style.setProperty('--width', this.settings.width);
        nativeElement.style.setProperty('--max-width', this.settings.maxWidth);
        nativeElement.style.setProperty('--max-height', this.settings.maxHeight);

        // Zorg ervoor dat klikken op het connectedElement de popup niet opnieuw opent, wordt gereset in de ngOnDestroy.

        this._renderer.setStyle(this.connectedElement.element.nativeElement, 'pointer-events', 'none');

        this.setupAnimation();
    }

    ngAfterContentChecked(): void {
        this.style();
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.setupListeners();
            this.viewContainerRef.element.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    ngOnDestroy(): void {
        this._renderer.removeStyle(this.connectedElement.element.nativeElement, 'pointer-events');
        this._destroy$.next();
        this._destroy$.complete();
    }

    private setupListeners() {
        const notInsideFilter = (data: MouseLocationElement) =>
            !(
                data.mouseX >= data.elementRect.left &&
                data.mouseX <= data.elementRect.right &&
                data.mouseY >= data.elementRect.top &&
                data.mouseY <= data.elementRect.bottom
            );

        fromEvent(window, 'click')
            .pipe(
                map((event: PointerEvent) => ({
                    mouseX: event.clientX,
                    mouseY: event.clientY,
                    elementRect: this.viewContainerRef.element.nativeElement.getBoundingClientRect()
                })),
                filter(notInsideFilter),
                takeUntil(this._destroy$)
            )
            .subscribe(() => this.animateAndClose());

        fromEvent(window, 'touchend')
            .pipe(
                map((event: TouchEvent) => ({
                    mouseX: event.changedTouches[0].clientX,
                    mouseY: event.changedTouches[0].clientY,
                    elementRect: this.viewContainerRef.element.nativeElement.getBoundingClientRect()
                })),
                filter(notInsideFilter),
                takeUntil(this._destroy$)
            )
            .subscribe(() => this.animateAndClose());

        // Voorkom dat enter op connected element de popup opnieuw opent.
        fromEvent(this.connectedElement.element.nativeElement, 'keydown')
            .pipe(
                filter(
                    (event: KeyboardEvent) =>
                        (this._accessibilityService.isActionEvent(event) || event.key === 'Esc') &&
                        document.activeElement === this.connectedElement.element.nativeElement
                ),
                takeUntil(this._destroy$)
            )
            .subscribe((event) => {
                event.stopPropagation();
                this.animateAndClose();
            });
    }

    private style() {
        const connectedLocation = this.connectedElement.element.nativeElement.getBoundingClientRect() as BoundingClientRect;
        const popupLocation = this.viewContainerRef.element.nativeElement.getBoundingClientRect() as BoundingClientRect;

        const top = this._popupPositionService.calculateTop(connectedLocation, popupLocation, this.settings);
        const left = this._popupPositionService.calculateLeft(connectedLocation, popupLocation, this.settings);

        this.top = `${top}px`;
        this.left = `${left}px`;

        this._changeDetectorRef.markForCheck();
    }

    private setupAnimation() {
        switch (this.settings.animation) {
            case 'fade':
                this._animationState = 'fade-visible';
                break;
            case 'slide':
                this._animationState = 'slide-visible';
                break;
        }
    }

    @HostListener('@popupAnimation.done')
    private onAnimationDone() {
        if (this._animationState === 'fade-visible' || this._animationState === 'slide-visible') {
            this.viewContainerRef.element.nativeElement.style.setProperty('--overflow', 'auto');
        } else if (this._animationState === 'fade-hidden' || this._animationState === 'slide-hidden') {
            this.close();
        }
    }

    public animateAndClose() {
        switch (this.settings.animation) {
            case 'fade':
                this._animationState = 'fade-hidden';
                break;
            case 'slide':
                this._animationState = 'slide-hidden';
                break;
            case 'none':
                this.close();
                break;
        }
        this._changeDetectorRef.markForCheck();
    }

    public close() {
        this._popupService.close(this.uuid);
    }
}
