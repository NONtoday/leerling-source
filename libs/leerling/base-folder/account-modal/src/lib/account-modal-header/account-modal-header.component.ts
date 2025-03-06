import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, OnInit, ViewChild, inject, output } from '@angular/core';
import { DeviceService, IconDirective, IconSize } from 'harmony';
import { IconChevronLinks, IconSluiten, provideIcons } from 'harmony-icons';
import { Observable, map } from 'rxjs';

export type HeaderAction = 'terug' | 'sluiten';

@Component({
    selector: 'sl-account-modal-header',
    imports: [CommonModule, IconDirective],
    templateUrl: './account-modal-header.component.html',
    styleUrls: ['./account-modal-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronLinks, IconSluiten)]
})
export class AccountModalHeaderComponent implements OnInit {
    private _deviceService = inject(DeviceService);

    @Input({ required: true }) public titel: string;
    @Input() @HostBinding('class.toon-terug') public toonTerug: boolean;
    @ViewChild('title', { read: ElementRef }) titleRef: ElementRef;
    public actionClicked = output<HeaderAction>();

    public actionSize$: Observable<IconSize>;

    ngOnInit() {
        this.actionSize$ = this._deviceService.isTabletOrDesktop$.pipe(
            map((isTabletOrDesktop) => (isTabletOrDesktop ? 'medium' : 'smallest'))
        );
    }
}
