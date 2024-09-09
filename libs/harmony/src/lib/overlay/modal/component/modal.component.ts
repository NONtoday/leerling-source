import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    OnInit,
    ViewChild,
    ViewContainerRef,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import * as anime from 'animejs/lib/anime.js';
import { IconPijlLinks, IconSluiten, IconWaarschuwing, provideIcons } from 'harmony-icons';
import { createNotifier } from 'ngxtension/create-notifier';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { NgxDrag, NgxMove, NgxScroll, type NgxInjectDrag } from 'ngxtension/gestures';
import { debounceTime, filter, fromEvent } from 'rxjs';
import { IconDirective } from '../../../icon/icon.directive';
import { DeviceService } from '../../../services/device.service';
import { modalContentAnimation, modalMaskAnimation } from './modal.animations';
import { ContentAnimationState, MaskAnimationState, ModalSettings } from './modal.settings';

@Component({
    selector: 'hmy-modal',
    standalone: true,
    imports: [CommonModule, IconDirective, NgxDrag, NgxMove, A11yModule, NgxScroll],
    templateUrl: './modal.component.html',
    animations: [modalMaskAnimation, modalContentAnimation],
    styleUrls: ['./modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(window:keydown.escape)': 'animateAndClose()'
    },
    providers: [provideIcons(IconSluiten, IconWaarschuwing, IconPijlLinks)]
})
export class ModalComponent implements OnInit {
    @ViewChild('content', { read: ViewContainerRef, static: true }) contentRef: ViewContainerRef;
    containerRef = viewChild.required<ElementRef>('container');

    private readonly router = inject(Router);
    private readonly deviceService = inject(DeviceService);
    readonly viewContainerRef = inject(ViewContainerRef);
    readonly destroyRef = inject(DestroyRef);
    private readonly elementRef = inject(ElementRef);
    private isClosing = false;
    public closingBlocked = false;

    settings = input.required<ModalSettings>();

    closeModal = output<void>();

    maskState = signal<MaskAnimationState>('show');
    contentState = signal<ContentAnimationState>(this.deviceService.isTabletOrDesktop() ? 'show-modal' : 'show-rollup');
    dragging = signal<boolean>(false);

    canScroll = signal<boolean>(false);
    isScrolling = signal<boolean>(false);

    dragConfig: () => NgxInjectDrag['config'] = computed(() => ({
        enabled: !this.deviceService.isTabletOrDesktop(),
        filterTaps: true,
        axis: 'y',
        bounds: { top: 0 },
        pointer: {
            capture: false
        }
    }));
    calculateScroll = createNotifier();
    calculateCanScroll = createNotifier();

    isDestroyed = false;

    constructor() {
        effect(
            () => {
                this.calculateScroll.listen();

                this.isScrolling.set(this.containerRef().nativeElement.scrollTop !== 0);
            },
            { allowSignalWrites: true }
        );

        explicitEffect([this.settings], ([settings]) => {
            if (settings.closePosition.top)
                this.elementRef.nativeElement.style.setProperty('--close-top', settings.closePosition.top + 'px');
            if (settings.closePosition.right)
                this.elementRef.nativeElement.style.setProperty('--close-right', settings.closePosition.right + 'px');
        });
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationStart && !this.settings().keepOnNavigation),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                this.closeModal.emit();
            });
        this.destroyRef.onDestroy(() => (this.isDestroyed = true));

        explicitEffect([this.calculateCanScroll.listen], () => {
            this.canScroll.set(isScrollable(this.containerRef().nativeElement));
        });
        fromEvent(window, 'resize')
            .pipe(debounceTime(50), takeUntilDestroyed())
            .subscribe(() => this.calculateCanScroll.notify());
    }

    onDrag({ movement: [, y], last, first, currentTarget }: NgxInjectDrag['state']) {
        // wanneer we aan het scrollen zijn, moeten we de modal niet naar beneden draggen. Als we bovenaan zijn met de scroll wel.
        if (this.isClosing || this.closingBlocked || (this.isScrolling() && (currentTarget as HTMLDivElement).scrollTop !== 0)) return;
        if (first) {
            this.dragging.set(true);
        }
        anime.running.forEach((x) => x.pause());
        if (last && y > 100) {
            this.animateAndClose(y);
        } else if (last) {
            this.springBackOpen();
        } else {
            this.moveOnDrag(y);
        }
    }

    ngOnInit() {
        const nativeElement = this.viewContainerRef.element.nativeElement;
        nativeElement.style.setProperty('--content-padding', this.settings().contentPadding);
        nativeElement.style.setProperty('--height-rollup', this.settings().heightRollup);
        nativeElement.style.setProperty('--max-height-rollup', this.settings().maxHeightRollup);
        nativeElement.style.setProperty('--height-modal', this.settings().heightModal);
        nativeElement.style.setProperty('--max-height-modal', this.settings().maxHeightModal);
        nativeElement.style.setProperty('--width-modal', this.settings().widthModal);
    }

    public animateAndClose(y = 0) {
        if (this.closingBlocked) return;
        this.isClosing = true;
        this.maskState.set('hide');
        if (this.deviceService.isTabletOrDesktop()) {
            this.contentState.set('hide-modal');
        } else {
            anime({
                targets: this.containerRef().nativeElement,
                translateY: [y, this.containerRef().nativeElement.clientHeight],
                duration: 200,
                easing: 'linear',
                complete: () => !this.isDestroyed && this.closeModal.emit()
            });
        }
    }

    private springBackOpen() {
        this.dragging.set(false);
        anime({
            targets: this.containerRef().nativeElement,
            translateY: 0,
            duration: 100,
            easing: 'spring'
        });
    }

    private moveOnDrag(y: number) {
        anime({
            targets: this.containerRef().nativeElement,
            translateY: y,
            duration: 0,
            easing: 'linear'
        });
    }

    public onContentAnimationDone() {
        if (!this.isDestroyed && this.contentState() === 'hide-modal') {
            this.closeModal.emit();
        }
    }
}

const isScrollable = (ele: any) => {
    // Compare the height to see if the element has scrollable content
    const hasScrollableContent = ele.scrollHeight > ele.clientHeight;

    // It's not enough because the element's `overflow-y` style can be set as
    // * `hidden`
    // * `hidden !important`
    // In those cases, the scrollbar isn't shown
    const overflowYStyle = window.getComputedStyle(ele).overflowY;
    const isOverflowHidden = overflowYStyle.indexOf('hidden') !== -1;

    return hasScrollableContent && !isOverflowHidden;
};
