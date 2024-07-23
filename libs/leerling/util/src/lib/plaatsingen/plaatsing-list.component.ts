import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, QueryList, ViewChildren, inject, input, model, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SPlaatsing } from 'leerling/store';
import { AccessibilityService } from '../accessibility/accessibility.service';
import { KeyPressedService } from '../keypressed/keypressed.service';
import { PlaatsingItemComponent } from './plaatsing-item/plaatsing-item.component';
import { PLAATSING_COMPONENT_TABINDEX } from './plaatsingen.component';

@Component({
    selector: 'sl-plaatsing-list',
    standalone: true,
    imports: [CommonModule, PlaatsingItemComponent, A11yModule],
    template: ` <div class="plaatsingcontainer" [cdkTrapFocusAutoCapture]="keyboardNavigationDetected" cdkTrapFocus>
        @for (plaatsing of plaatsingen(); track plaatsing.UUID) {
            <sl-plaatsing-item
                [plaatsing]="plaatsing"
                [active]="plaatsing.UUID === actievePlaatsing()?.UUID"
                [tabIndex]="0"
                [attr.aria-selected]="plaatsing.UUID === actievePlaatsing()?.UUID"
                (click)="plaatsingGewisseld.emit(plaatsing)"
                role="option" />
        }
    </div>`,
    styles: [
        `
            :host {
                padding: 8px;
                box-sizing: border-box;
                background-color: var(--bg-elevated-none);
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
        `
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaatsingListComponent {
    private _keyPressedService = inject(KeyPressedService);
    private _accessibilityService = inject(AccessibilityService);

    public plaatsingComponentTabindex = PLAATSING_COMPONENT_TABINDEX;

    public plaatsingen = input.required<SPlaatsing[]>();
    public actievePlaatsing = model<SPlaatsing | undefined>(undefined);
    public keyboardNavigationDetected = this._accessibilityService.isAccessedByKeyboard();

    plaatsingGewisseld = output<SPlaatsing>();
    @ViewChildren(PlaatsingItemComponent, { read: ElementRef }) plaatsingItems: QueryList<ElementRef>;

    constructor() {
        this._keyPressedService.mainKeyboardEvent$.pipe(takeUntilDestroyed()).subscribe((event) => this.handleKeyEvent(event));
    }

    select(plaatsing: SPlaatsing) {
        this.actievePlaatsing.set(plaatsing);
        this.plaatsingGewisseld.emit(plaatsing);
    }

    handleKeyEvent(event: KeyboardEvent) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.focusNext();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.focusPrevious();
        }
    }

    private getFocussedItem() {
        return this.plaatsingItems.toArray().findIndex((item) => item.nativeElement === document.activeElement);
    }

    private focusNext() {
        const activeIndex = this.getFocussedItem();
        const nextIndex = activeIndex === this.plaatsingItems.length - 1 ? 0 : activeIndex + 1;
        this.plaatsingItems.toArray()[nextIndex].nativeElement.focus();
    }

    private focusPrevious() {
        const activeIndex = this.getFocussedItem();
        const previousIndex = activeIndex === 0 ? this.plaatsingItems.length - 1 : activeIndex - 1;
        this.plaatsingItems.toArray()[previousIndex].nativeElement.focus();
    }
}
