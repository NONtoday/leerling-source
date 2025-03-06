import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, QueryList, ViewChildren, inject, input, model, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccessibilityService } from '../accessibility/accessibility.service';
import { KeyPressedService } from '../keypressed/keypressed.service';
import { DropdownItemComponent } from './dropdown-item/dropdown-item.component';
import { DropdownItem } from './dropdown.component';

@Component({
    selector: 'sl-dropdown-list',
    imports: [CommonModule, DropdownItemComponent, A11yModule],
    template: ` <div class="dropdowncontainer" [cdkTrapFocusAutoCapture]="keyboardNavigationDetected" cdkTrapFocus>
        @for (item of dropdownItems(); track item.identifier) {
            <sl-dropdown-item
                [dropdownItem]="item"
                [active]="item.identifier === actieveItem()?.identifier"
                [tabIndex]="0"
                [attr.aria-selected]="item.identifier === actieveItem()?.identifier"
                (click)="itemGewisseld.emit(item)"
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
export class DropdownListComponent<T> {
    private _keyPressedService = inject(KeyPressedService);
    private _accessibilityService = inject(AccessibilityService);

    public dropdownItems = input.required<DropdownItem<T>[]>();
    public actieveItem = model<DropdownItem<T> | undefined>(undefined);
    public keyboardNavigationDetected = this._accessibilityService.isAccessedByKeyboard();

    itemGewisseld = output<DropdownItem<T>>();
    @ViewChildren(DropdownItemComponent, { read: ElementRef }) dropdownItemsElementref: QueryList<ElementRef>;

    constructor() {
        this._keyPressedService.mainKeyboardEvent$.pipe(takeUntilDestroyed()).subscribe((event) => this.handleKeyEvent(event));
    }

    select(item: DropdownItem<T>) {
        this.actieveItem.set(item);
        this.itemGewisseld.emit(item);
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
        return this.dropdownItemsElementref.toArray().findIndex((item) => item.nativeElement === document.activeElement);
    }

    private focusNext() {
        const activeIndex = this.getFocussedItem();
        const nextIndex = activeIndex === this.dropdownItemsElementref.length - 1 ? 0 : activeIndex + 1;
        this.dropdownItemsElementref.toArray()[nextIndex].nativeElement.focus();
    }

    private focusPrevious() {
        const activeIndex = this.getFocussedItem();
        const previousIndex = activeIndex === 0 ? this.dropdownItemsElementref.length - 1 : activeIndex - 1;
        this.dropdownItemsElementref.toArray()[previousIndex].nativeElement.focus();
    }
}
