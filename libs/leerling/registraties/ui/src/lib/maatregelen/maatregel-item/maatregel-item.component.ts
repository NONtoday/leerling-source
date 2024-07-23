import { Component, Input } from '@angular/core';
import { SlDatePipe } from 'leerling-util';
import { SMaatregelToekenning } from 'leerling/store';

@Component({
    selector: 'sl-maatregel-item',
    standalone: true,
    templateUrl: './maatregel-item.component.html',
    styleUrls: ['./maatregel-item.component.scss'],
    imports: [SlDatePipe]
})
export class MaatregelItemComponent {
    @Input({ required: true }) toekenning: SMaatregelToekenning;
}
