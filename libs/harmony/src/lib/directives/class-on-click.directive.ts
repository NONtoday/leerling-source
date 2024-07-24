import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, Renderer2, inject } from '@angular/core';
import { Subject, fromEvent, merge, takeUntil } from 'rxjs';

@Directive({
    selector: '[hmyClassOnClick]',
    standalone: true
})
export class ClassOnClickDirective implements AfterViewInit, OnDestroy {
    private element = inject(ElementRef);
    private renderer = inject(Renderer2);
    @Input() hmyClassOnClick: string;

    private onDestroy$ = new Subject<void>();

    ngAfterViewInit(): void {
        const setActive = () => this.renderer.addClass(this.element.nativeElement, this.hmyClassOnClick);
        const mousedown$ = fromEvent(this.element.nativeElement, 'mousedown');
        const touchstart$ = fromEvent(this.element.nativeElement, 'touchstart');
        merge(mousedown$, touchstart$).pipe(takeUntil(this.onDestroy$)).subscribe(setActive);

        const removeActive = () => this.renderer.removeClass(this.element.nativeElement, this.hmyClassOnClick);
        const mouseup$ = fromEvent(window, 'mouseup');
        const touchend$ = fromEvent(window, 'touchend');
        merge(mouseup$, touchend$).pipe(takeUntil(this.onDestroy$)).subscribe(removeActive);
    }

    ngOnDestroy(): void {
        this.onDestroy$.next();
        this.onDestroy$.complete();
    }
}
