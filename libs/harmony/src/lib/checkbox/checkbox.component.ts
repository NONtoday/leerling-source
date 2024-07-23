/* eslint-disable @typescript-eslint/no-empty-function */
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { IconCheck, provideIcons } from 'harmony-icons';
import { TooltipDirective } from '../directives/tooltip/tooltip.directive';
import { IconDirective } from '../icon/icon.directive';
import { DeviceService } from '../services/device.service';

@Component({
    selector: 'hmy-checkbox',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, TooltipDirective, IconDirective],
    templateUrl: './checkbox.component.html',
    styleUrls: ['./checkbox.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconCheck)]
})
export class CheckboxComponent implements OnChanges {
    private _elementRef = inject(ElementRef);

    @Input() checked?: boolean;
    @Input() disabled?: boolean;
    @Input() disabledTooltip?: string;
    @Input() color: 'primary' | 'positive' = 'primary';

    customTabIndex = input(0);

    private _deviceService = inject(DeviceService);
    public isDesktop = toSignal(this._deviceService.isDesktop$, { initialValue: this._deviceService.isDesktop() });

    valueChanged = output<boolean>();

    ngOnChanges(): void {
        this._elementRef.nativeElement.style.setProperty('--active-color', `var(--action-${this.color}-normal)`);
        this._elementRef.nativeElement.style.setProperty('--active-hover-color', `var(--action-${this.color}-strong)`);
    }
}
