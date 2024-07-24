import { AUTO_STYLE, animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ViewChild,
    ViewContainerRef,
    effect,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter, fromEvent, map, merge } from 'rxjs';
import { match } from 'ts-pattern';
import { BoundingClientRect, MouseLocationElement } from '../popup.model';
import { calculateLeft, calculateTop } from '../popup.position-utils';
import { PopupSettings } from '../settings/popup-settings';

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
    state('slide-visible', style({ height: AUTO_STYLE, overflow: 'hidden' })),
    state('slide-hidden', style({ height: 0, overflow: 'hidden' })),
    transition('slide-visible => slide-hidden', [animate('250ms ease-out')])
]);

export type AnimationState = 'fade-visible' | 'fade-hidden' | 'slide-visible' | 'slide-hidden' | undefined;

@Component({
    selector: 'hmy-popup',
    standalone: true,
    imports: [CommonModule],
    template: '<ng-template #content></ng-template>',
    styleUrls: ['./popup.component.scss'],
    animations: [POPUP_ANIMATION],
    host: {
        '[@popupAnimation]': 'animationState()',
        '(@popupAnimation.done)': 'onAnimationDone()',
        '[style.top.px]': 'top()',
        '[style.left.px]': 'left()',
        '(window:keydown.escape)': 'animateAndClose()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopupComponent implements AfterViewInit {
    @ViewChild('content', { read: ViewContainerRef, static: true }) contentRef: ViewContainerRef;
    private readonly router = inject(Router);
    readonly destroyRef = inject(DestroyRef);
    readonly viewContainerRef = inject(ViewContainerRef);

    settings = input.required<PopupSettings>();
    connectedElement = input.required<ViewContainerRef>();

    closePopup = output<void>();

    top = signal<number>(0);
    left = signal<number>(0);
    animationState = signal<AnimationState>(undefined);
    isDestroyed = false;

    constructor() {
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationStart && !this.settings().keepOnNavigation),
                takeUntilDestroyed()
            )
            .subscribe(() => this.closePopup.emit());
        effect(
            () => {
                this.viewContainerRef.element.nativeElement.style.setProperty('--width', this.settings().width);
                this.viewContainerRef.element.nativeElement.style.setProperty('--max-width', this.settings().maxWidth);
                this.viewContainerRef.element.nativeElement.style.setProperty('--max-height', this.settings().maxHeight);

                const connectedLocation = this.connectedElement().element.nativeElement.getBoundingClientRect() as BoundingClientRect;
                const popupLocation = this.viewContainerRef.element.nativeElement.getBoundingClientRect() as BoundingClientRect;

                this.top.set(calculateTop(connectedLocation, popupLocation, this.settings()));
                const left = this.settings().left ?? calculateLeft(connectedLocation, popupLocation, this.settings());
                this.left.set(left);
            },
            { allowSignalWrites: true }
        );
        this.destroyRef.onDestroy(() => (this.isDestroyed = true));
    }

    ngAfterViewInit(): void {
        this.setupListeners();
    }

    private setupListeners() {
        const notInsideFilter = (data: MouseLocationElement) =>
            !(
                data.mouseX >= data.elementRect.left &&
                data.mouseX <= data.elementRect.right &&
                data.mouseY >= data.elementRect.top &&
                data.mouseY <= data.elementRect.bottom
            );

        const mouseDown$ = fromEvent(window, 'mousedown').pipe(
            map((event: PointerEvent) => ({
                mouseX: event.clientX,
                mouseY: event.clientY,
                elementRect: this.viewContainerRef.element.nativeElement.getBoundingClientRect()
            }))
        );

        const touchStart$ = fromEvent(window, 'touchstart').pipe(
            map((event: TouchEvent) => ({
                mouseX: event.changedTouches[0].clientX,
                mouseY: event.changedTouches[0].clientY,
                elementRect: this.viewContainerRef.element.nativeElement.getBoundingClientRect()
            }))
        );

        merge(mouseDown$, touchStart$)
            .pipe(filter(notInsideFilter), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.animateAndClose());

        // Voorkom dat enter op connected element de popup opnieuw opent.
        fromEvent(this.connectedElement().element.nativeElement, 'keydown')
            .pipe(
                filter(
                    (event: KeyboardEvent) =>
                        event.key === 'Enter' ||
                        (event.key === ' ' && document.activeElement === this.connectedElement().element.nativeElement)
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((event) => {
                event.stopPropagation();
                this.animateAndClose();
            });
    }

    onAnimationDone() {
        if (!this.isDestroyed && (this.animationState() === 'fade-hidden' || this.animationState() === 'slide-hidden')) {
            this.closePopup.emit();
        }
    }

    animateAndClose = () =>
        match(this.settings().animation)
            .with('fade', () => this.animationState.set('fade-hidden'))
            .with('slide', () => this.animationState.set('slide-hidden'))
            .with('none', () => this.closePopup.emit())
            .exhaustive();
}
