import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    Input,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewContainerRef,
    inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { DeviceService, IconDirective } from 'harmony';
import { IconSluiten, provideIcons } from 'harmony-icons';
import { filter } from 'rxjs';
import { AVATAR_TAB_INDEX, AccessibilityService } from '../../accessibility/accessibility.service';
import { KeyPressedService } from '../../keypressed/keypressed.service';
import { ISwipable, SwipeInfo } from '../../swipe/swipable.interface';
import { SwipeManager } from '../../swipe/swipe.manager';
import { ModalScrollableElementsProvider } from '../modal-scrollable-elements-provider';
import { ModalService } from '../service/modal.service';
import { ModalSettings } from './modal.settings';

type MaskAnimationState = 'show' | 'hide';

const maskAnimation = trigger('maskAnimation', [
    transition(':enter', [style({ opacity: 0 }), animate('150ms ease-in', style({ opacity: 1 }))]),
    state('hide', style({ opacity: 0 })),
    transition('* => hide', [animate('150ms ease-out')])
]);

type ContentAnimationState = 'show-modal' | 'show-rollup' | 'hide-modal' | 'hide-rollup';

const contentAnimation = trigger('contentAnimation', [
    state('show-modal', style({ opacity: 1, transform: 'scale(1)' })),
    state('hide-modal', style({ opacity: 0, transform: 'scale(0.8)' })),
    transition('void => show-modal', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('150ms ease-in', style({ opacity: 1, transform: 'scale(1)' }))
    ]),
    transition('* => hide-modal', [animate('150ms ease-out')]),

    state('show-rollup', style({ transform: 'translateY({{yTransform}})' }), { params: { yTransform: '0' } }),
    state('hide-rollup', style({ transform: 'translateY(100%)' })),
    transition('void => show-rollup', [style({ transform: 'translate(0,100%)' }), animate('350ms cubic-bezier(0.17, 0.89, 0.24, 1)')]),
    transition('* => hide-rollup', [animate('250ms ease-out')])
]);

const ANIMATIONS = [maskAnimation, contentAnimation];

@Component({
    selector: 'sl-modal',
    standalone: true,
    imports: [CommonModule, IconDirective],
    templateUrl: './modal.component.html',
    animations: ANIMATIONS,
    styleUrls: ['./modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconSluiten)]
})
export class ModalComponent implements OnInit, OnDestroy, ISwipable, AfterViewInit {
    private _modalService = inject(ModalService);
    private _deviceService = inject(DeviceService);
    private _changeDetector = inject(ChangeDetectorRef);
    private _router = inject(Router);
    private _swipeManager = new SwipeManager(this);
    private _keyPressedService = inject(KeyPressedService);
    private _accessibilityService = inject(AccessibilityService);

    private _isAnimating = false;
    public closingBlocked = false;

    public amountShowRollupYTransform = '0px';
    public viewContainerRef = inject(ViewContainerRef);

    @ViewChild('content', { read: ElementRef, static: true }) contentRef: ElementRef;
    @ViewChild('contentContainer', { read: ElementRef, static: true }) contentContainerRef: ElementRef;
    @ViewChild('swipeIndicator', { read: ElementRef, static: true }) swipeIndicatorRef: ElementRef;

    @Input() settings: ModalSettings;

    public maskState: MaskAnimationState = 'show';
    public contentState: ContentAnimationState = this._deviceService.isTabletOrDesktop() ? 'show-modal' : 'show-rollup';

    public contentComponent: any;

    private _currentScrollingElements: ElementRef[] = [];

    constructor() {
        this._router.events
            .pipe(
                filter((event) => event instanceof NavigationStart && !this.settings.keepOnNavigation),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                this.close();
            });

        this._keyPressedService.overlayKeyboardEvent$.pipe(takeUntilDestroyed()).subscribe((event) => this.handleKeyEvent(event));
    }

    private handleKeyEvent(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            if (this.closingBlocked) return;
            this.animateAndClose();
            this._accessibilityService.focusElementWithTabIndex(AVATAR_TAB_INDEX);
        }
    }

    ngOnInit() {
        const nativeElement = this.viewContainerRef.element.nativeElement;
        nativeElement.style.setProperty('--content-padding', this.settings.contentPadding);
        nativeElement.style.setProperty('--height-rollup', this.settings.heightRollup);
        nativeElement.style.setProperty('--max-height-rollup', this.settings.maxHeightRollup);
        nativeElement.style.setProperty('--height-modal', this.settings.heightModal);
        nativeElement.style.setProperty('--max-height-modal', this.settings.maxHeightModal);

        if ('getScrollableElements' in this.contentComponent) {
            const provider = this.contentComponent as ModalScrollableElementsProvider;
            provider.getScrollableElements().subscribe((elements) => {
                this._currentScrollingElements.forEach((element) => {
                    element?.nativeElement && enableBodyScroll(element.nativeElement);
                });

                elements.forEach((element) => {
                    element?.nativeElement && disableBodyScroll(element.nativeElement);
                });

                this._currentScrollingElements = elements;
            });
        }
    }

    ngAfterViewInit(): void {
        if (this._accessibilityService.isAccessedByKeyboard()) {
            this._accessibilityService.goToContent(this.contentRef);
        }
    }

    ngOnDestroy(): void {
        this._currentScrollingElements.forEach((element) => {
            element?.nativeElement && enableBodyScroll(element.nativeElement);
        });
    }

    onTouchStart(event: TouchEvent) {
        if (this.isTouchEventAllowed(event)) {
            this._swipeManager.onTouchStart(event);
        }
    }

    onTouchMove(event: TouchEvent) {
        this._swipeManager.onTouchMove(event);
    }

    onTouchEnd(event: TouchEvent) {
        this._swipeManager.onTouchEnd(event);
    }

    private isTouchEventAllowed(event: TouchEvent): boolean {
        if (this._deviceService.isTabletOrDesktop()) return false;

        const contentNotScrolled = this.contentRef.nativeElement.scrollTop === 0;
        const guardAllowsSwipe = 'isSwipeAllowed' in this.contentComponent ? this.contentComponent.isSwipeAllowed() : true;
        const isSwipeIndicator = event.target === this.swipeIndicatorRef.nativeElement;

        return (guardAllowsSwipe && contentNotScrolled) || isSwipeIndicator;
    }

    getSwipeInfo(): SwipeInfo {
        return {
            swipableElement: this.contentContainerRef,
            swipeDirection: ['down'],
            pixelsMovedToSuccessfullSwipe: 36
        };
    }

    onCancelSwipe(): void {
        this.amountShowRollupYTransform = '0px';
    }

    onSuccessfullSwipe(percentageSwiped: number): void {
        this.amountShowRollupYTransform = percentageSwiped + '%';
        this._changeDetector.detectChanges();
        this.animateAndClose();
    }

    onSwiping(): void {
        return;
    }

    onSwipeStart(): void {
        return;
    }

    public onContentAnimationStarted() {
        this._isAnimating = true;
    }

    public onContentAnimationDone() {
        this._isAnimating = false;
        if (this.contentState === 'hide-modal' || this.contentState === 'hide-rollup') {
            this.close();
        }
    }

    public animateAndClose() {
        if (this._isAnimating) {
            return;
        }

        this.maskState = 'hide';
        this.contentState = this._deviceService.isTabletOrDesktop() ? 'hide-modal' : 'hide-rollup';
        this._changeDetector.markForCheck();
    }

    public close() {
        this._modalService.close();
    }
}
