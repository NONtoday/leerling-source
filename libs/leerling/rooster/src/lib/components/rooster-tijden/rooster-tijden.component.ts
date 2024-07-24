import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ROOSTER_TIJDLIJN_LABELS } from '../../rooster-util';

@Component({
    selector: 'sl-rooster-tijden',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './rooster-tijden.component.html',
    styleUrls: ['./rooster-tijden.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterTijdenComponent {
    public labels = ROOSTER_TIJDLIJN_LABELS;
}
