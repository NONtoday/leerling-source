import { AfterViewInit, Directive, ElementRef, OnDestroy, Renderer2, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResizeObserver as PolyfillObserver } from '@juggle/resize-observer';
import { combineLatest, fromEvent, startWith } from 'rxjs';

const ResizeObserver = window.ResizeObserver || PolyfillObserver;

@Directive({
    selector: '[hmyScrollableFade]'
})
export class ScrollableFadeDirective implements AfterViewInit, OnDestroy {
    private elementRef = inject(ElementRef);
    private renderer = inject(Renderer2);

    private resizeObserver = new ResizeObserver(() => this.update());

    public size = input(24);

    constructor() {
        const scrollEvent = fromEvent(this.elementRef.nativeElement, 'scroll').pipe(startWith(new Event('scroll')));
        const resizeEvent = fromEvent(window, 'resize').pipe(startWith(new Event('resize')));
        combineLatest([scrollEvent, resizeEvent])
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.update());
    }

    ngAfterViewInit(): void {
        this.resizeObserver.observe(this.elementRef.nativeElement);
        this.update();
    }

    ngOnDestroy(): void {
        this.resizeObserver.unobserve(this.elementRef.nativeElement);
        this.resizeObserver.disconnect();
    }

    private update() {
        const element = this.elementRef.nativeElement;
        const elementWidth = Math.round(element.getBoundingClientRect().width);
        const scrollleft = Math.round(element.scrollLeft);
        const scrollWidth = Math.round(element.scrollWidth);
        const fadeLeftSize = scrollleft > 0 ? this.size() : 0;
        const fadeRightSize = scrollWidth - scrollleft > elementWidth ? this.size() : 0;
        const fadeWidth = fadeLeftSize + fadeRightSize;

        if (fadeWidth > 0) {
            this.renderer.setStyle(
                element,
                'mask-image',
                `linear-gradient(
                    to right,
                    transparent 0px,
                    var(--bg-neutral-none) ${fadeLeftSize}px,
                    var(--bg-neutral-none) calc(100% - ${fadeRightSize}px),
                    transparent 100%
                )`
            );
        } else {
            this.renderer.removeStyle(element, 'mask-image');
        }
    }
}
