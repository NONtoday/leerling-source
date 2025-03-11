import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconCheck, provideIcons } from 'harmony-icons';
import { TooltipDirective } from '../directives/tooltip/tooltip.directive';
import { IconDirective } from '../icon/icon.directive';
import { DeviceService } from '../services/device.service';

@Component({
    selector: 'hmy-checkbox',
    standalone: true,
    imports: [CommonModule, FormsModule, TooltipDirective, IconDirective],
    templateUrl: './checkbox.component.html',
    styleUrls: ['./checkbox.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: CheckboxComponent,
            multi: true
        },
        provideIcons(IconCheck)
    ]
})
export class CheckboxComponent implements ControlValueAccessor, OnChanges {
    private _elementRef = inject(ElementRef);
    private changeDetector = inject(ChangeDetectorRef);
    private _touched = false;
    private _onChange = (value: boolean) => this.valueChanged.emit(value);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private _onTouch = () => {};

    @Input() checked?: boolean;
    @Input() disabled = false;
    @Input() disabledTooltip?: string;
    @Input() color: 'primary' | 'positive' = 'primary';
    @Input() label?: string;
    @Input() maxWidthLabel = 'none';

    customTabIndex = input(0);

    private _deviceService = inject(DeviceService);
    public isDesktop = toSignal(this._deviceService.isDesktop$, { initialValue: this._deviceService.isDesktop() });

    valueChanged = output<boolean>();

    ngOnChanges(): void {
        this._elementRef.nativeElement.style.setProperty('--active-color', `var(--action-${this.color}-normal)`);
        this._elementRef.nativeElement.style.setProperty('--active-hover-color', `var(--action-${this.color}-strong)`);
        if (this.label) {
            this._elementRef.nativeElement.classList.add('with-label');
        }
    }

    toggleCheckbox(event: Event) {
        if (this.disabled) return;
        this.checked = (<HTMLInputElement>event.target).checked;
        this._onChange(this.checked);
        this.touch();
    }

    toggleCheckboxFromLabel(): void {
        if (!this.disabled) {
            this.checked = !this.checked;
            this._onChange(this.checked);
            this._onTouch();
        }
    }

    touch() {
        if (this._touched) return;
        this._onTouch();
        this._touched = true;
    }

    writeValue(obj: any): void {
        this.checked = obj;
        this.changeDetector.markForCheck();
    }

    registerOnChange(fn: any): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this._onTouch = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }
}
