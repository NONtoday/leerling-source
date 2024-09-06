import { ChangeDetectorRef, Directive, inject, Input, Renderer2, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PopupService } from './service/popup.service';

const POPUP_OPEN_CLASS = 'popup-open';

@Directive({
    selector: '[slPopupOpen]',
    standalone: true
})
export class PopupOpenDirective {
    private _popupService = inject(PopupService);
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _renderer2 = inject(Renderer2);
    private _viewContainerRef = inject(ViewContainerRef);

    @Input() slPopupOpen: ViewContainerRef[];
    @Input() popupOpenClass = POPUP_OPEN_CLASS;

    constructor() {
        this._popupService.openPopups$.pipe(takeUntilDestroyed()).subscribe((openPopups) => {
            const isOpenForRef = this.slPopupOpen?.some((connectedRef) =>
                openPopups.some((popupRef) => popupRef.instance.connectedElement === connectedRef)
            );

            if (isOpenForRef) {
                this._renderer2.addClass(this._viewContainerRef.element.nativeElement, this.popupOpenClass ?? POPUP_OPEN_CLASS);
            } else {
                this._renderer2.removeClass(this._viewContainerRef.element.nativeElement, this.popupOpenClass ?? POPUP_OPEN_CLASS);
            }
            this._changeDetectorRef.markForCheck();
        });
    }
}
