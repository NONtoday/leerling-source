import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ToetssoortGemiddelde } from '../../../services/vakresultaten/vakresultaten-model';

@Component({
    selector: 'sl-toetssoortgemiddelde-item',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './toetssoortgemiddelde-item.component.html',
    styleUrls: ['./toetssoortgemiddelde-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToetssoortgemiddeldeItemComponent {
    @Input({ required: true }) toetssoortGemiddelde: ToetssoortGemiddelde;
}
