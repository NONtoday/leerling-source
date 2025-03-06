import { animate, AnimationEvent, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, ViewChild, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResolveStart, Router } from '@angular/router';
import { fadeInOnEnterAnimation, fadeOutAnimation, slideInRightOnEnterAnimation } from 'angular-animations';
import { debounceTime, filter } from 'rxjs';
import { KeyPressedService } from '../keypressed/keypressed.service';
import { CloseSidebarUtil } from './sidebar-model';

const ANIMATIONS = [
    fadeInOnEnterAnimation({
        duration: 300
    }),
    fadeOutAnimation({
        duration: 300
    }),
    slideInRightOnEnterAnimation({
        duration: 300
    }),
    trigger('slideOutRight', [transition('* => *', [animate('300ms ease', style({ transform: 'translateX(100%)' }))])])
];

export const SIDEBAR_COMPONENT_SELECTOR = 'sl-sidebar';

@Component({
    selector: SIDEBAR_COMPONENT_SELECTOR,
    imports: [CommonModule],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    animations: ANIMATIONS,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
    private _router = inject(Router);
    private _keyPressedService = inject(KeyPressedService);
    public viewContainerRef = inject(ViewContainerRef);

    @ViewChild('content', { read: ElementRef, static: true }) contentRef: ElementRef;

    public closeSidebarUtil = input.required<CloseSidebarUtil>();
    public closeAnimation = signal(false);

    constructor() {
        this._router.events
            .pipe(
                filter((event) => event instanceof ResolveStart),
                takeUntilDestroyed()
            )
            .subscribe(() => this.closeSidebarUtil().requestClose('navigation'));

        // debounce: we willen de escape key niet spammen als je hem ingedrukt houdt
        this._keyPressedService.overlayKeyboardEvent$
            .pipe(debounceTime(100), takeUntilDestroyed())
            .subscribe((event) => this.handleKeyEvent(event));
    }

    private handleKeyEvent(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            this.closeSidebarUtil().requestClose('escape-key');
        }
    }

    onBackdropClick() {
        this.closeSidebarUtil().requestClose('backdrop-click');
    }

    animateAndClose() {
        this.closeSidebarUtil().requestClose('external');
    }

    fadedOut(event: AnimationEvent) {
        if (event.toState && event.toState !== 'void') {
            this.closeSidebarUtil().finalizeClose(true, 'external');
        }
    }

    startSidebarCloseAnimation(): void {
        this.closeAnimation.set(true);
    }
}
