import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { IconDirective } from 'harmony';
import { IconCheck, provideIcons } from 'harmony-icons';
import { SPlaatsing } from 'leerling/store';

@Component({
    selector: 'sl-plaatsing-item',
    standalone: true,
    imports: [CommonModule, IconDirective],
    templateUrl: './plaatsing-item.component.html',
    styleUrls: ['./plaatsing-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconCheck)]
})
export class PlaatsingItemComponent {
    @Input() plaatsing: SPlaatsing;
    @Input() @HostBinding('class.active') active = false;
}
