import { inject } from '@angular/core';

/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, HostBinding, HostListener, Input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Optional } from '../optional/optional';

@Component({
    selector: 'hmy-toggle',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './toggle.component.html',
    styleUrls: ['./toggle.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ToggleComponent),
            multi: true
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToggleComponent implements ControlValueAccessor {
    private changeDetector = inject(ChangeDetectorRef);
    @Input() label: Optional<string>;

    @HostBinding('class.disabled') disabled = false;

    public isSelected: boolean;

    @HostListener('click')
    toggle() {
        if (this.disabled) {
            return;
        }
        this.isSelected = !this.isSelected;
        this._onChange(this.isSelected);
        this.changeDetector.markForCheck();
    }

    private _onChange = (value: boolean) => {};
    private _onTouch = () => {};

    writeValue(obj: boolean): void {
        this.isSelected = obj;
        this.changeDetector.markForCheck();
    }

    registerOnChange(fn: any): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this._onTouch = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }
}
