import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, HostListener, Input, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ClassOnClickDirective, DeviceService, IconDirective, NotificationCounterComponent } from 'harmony';
import { IconBericht, IconHuiswerk, IconName, IconResultaten, IconRooster, IconVandaag, provideIcons } from 'harmony-icons';
import { AccessibilityService } from 'leerling-util';
import { TabItem } from './tab-item';

@Component({
    selector: 'sl-tab-item',
    standalone: true,
    imports: [CommonModule, IconDirective, ClassOnClickDirective, NotificationCounterComponent],
    templateUrl: './tab-item.component.html',
    styleUrls: ['./tab-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconVandaag, IconRooster, IconHuiswerk, IconResultaten, IconBericht)]
})
export class TabItemComponent {
    private _elementRef = inject(ElementRef);
    private _accessibilityService = inject(AccessibilityService);
    private _deviceService = inject(DeviceService);

    @Input() public counter?: TabItem['counter'];
    @Input() public icon: IconName;
    @Input() public titel: string;

    @HostListener('click') onClick() {
        this._accessibilityService.resetFocusState();
    }

    @HostBinding('attr.aria-current') get ariaCurrent() {
        return this._elementRef.nativeElement.classList.contains('active') ? 'page' : 'false';
    }

    isDesktop = toSignal(this._deviceService.isDesktop$);
}
