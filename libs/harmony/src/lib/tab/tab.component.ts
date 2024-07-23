import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { NotificationCounterComponent } from '../notification/notification-counter/notification-counter.component';
import { NotificationIconComponent } from '../notification/notification-icon/notification-icon.component';
import { NotificationSolidComponent } from '../notification/notification-solid/notification-solid.component';
import { TabInput, isNotificationCounterTab, isNotificationIconTab, isNotificationSolidTab } from './tab.model';

@Component({
    selector: 'hmy-tab',
    standalone: true,
    imports: [CommonModule, NotificationCounterComponent, NotificationIconComponent, NotificationSolidComponent],
    templateUrl: './tab.component.html',
    styleUrls: ['./tab.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabComponent implements OnChanges {
    @Input({ required: true }) tab: TabInput;
    @HostBinding('attr.mode') @Input() tabMode: TabMode = 'default';
    @HostBinding('class.active') @Input() active = false;

    private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly isNotificationCounterTab = isNotificationCounterTab;
    readonly isNotificationIconTab = isNotificationIconTab;
    readonly isNotificationSolidTab = isNotificationSolidTab;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['tab'] && this.tab.additionalAttributes) {
            Object.entries(this.tab.additionalAttributes).forEach(([name, value]) =>
                this.elementRef.nativeElement.setAttribute(name, value)
            );
        }
    }
}

export type TabMode = 'default' | 'background';
