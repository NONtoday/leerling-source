import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { CssVarPipe, IconDirective } from 'harmony';
import { IconChevronRechts, provideIcons } from 'harmony-icons';
import { AccountModalTab } from '../account-modal/account-modal.component';

@Component({
    selector: 'sl-account-modal-tab',
    imports: [CommonModule, IconDirective, CssVarPipe],
    templateUrl: './account-modal-tab.component.html',
    styleUrls: ['./account-modal-tab.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronRechts)]
})
export class AccountModalTabComponent {
    @Input({ required: true }) tab: AccountModalTab;
    @Input() @HostBinding('class.active') active: boolean;
}
