import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { IconPillComponent, TooltipDirective, VakIconComponent } from 'harmony';
import { IconHogerNiveau, provideIcons } from 'harmony-icons';
import { SVakkeuzeGemiddelde } from 'leerling/store';
import { VakgemiddeldeItemCijferComponent } from '../vakgemiddelde-item-cijfer/vakgemiddelde-item-cijfer.component';

@Component({
    selector: 'sl-vakgemiddelde-item',
    imports: [CommonModule, IconPillComponent, TooltipDirective, VakgemiddeldeItemCijferComponent, VakIconComponent],
    templateUrl: './vakgemiddelde-item.component.html',
    styleUrls: ['./vakgemiddelde-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconHogerNiveau)]
})
export class VakgemiddeldeItemComponent {
    @Input({ required: true }) public vakgemiddelde: SVakkeuzeGemiddelde;
    @Input() public toonLegeKolom: boolean;
    @HostBinding('attr.role') private _role = 'button';
}
