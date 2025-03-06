import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { PogingData } from '../../../services/vakresultaten/vakresultaten-model';

@Component({
    selector: 'sl-resultaat-item-detail-herkansing-lijst',
    imports: [CommonModule],
    templateUrl: './resultaat-item-detail-herkansing-lijst.component.html',
    styleUrls: ['./resultaat-item-detail-herkansing-lijst.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultaatItemDetailHerkansingLijstComponent {
    @Input({ required: true }) pogingen: PogingData[];
}
