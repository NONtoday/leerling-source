import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input, input } from '@angular/core';
import { CssVarPipe, IconDirective } from 'harmony';
import { IconChevronRechts, provideIcons } from 'harmony-icons';
import { SchoolinformatieModalTab } from '../schoolinformatie-modal/schoolinformatie-model';

@Component({
    selector: 'sl-schoolinformatie-modal-tab',
    imports: [CommonModule, IconDirective, CssVarPipe],
    templateUrl: './schoolinformatie-modal-tab.component.html',
    styleUrls: ['./schoolinformatie-modal-tab.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronRechts)]
})
export class SchoolinformatieModalTabComponent {
    tab = input.required<SchoolinformatieModalTab>();
    @Input() @HostBinding('class.active') active: boolean;
}
