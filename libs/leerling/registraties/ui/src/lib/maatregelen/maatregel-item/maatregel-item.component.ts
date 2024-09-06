import { Component, Input } from '@angular/core';
import { IconDirective } from 'harmony';
import { IconReacties, provideIcons } from 'harmony-icons';
import { SlDatePipe } from 'leerling-util';
import { SMaatregelToekenning } from 'leerling/store';
import { MaatregelItemAriaLabelPipe } from './maatregel-item-aria-label.pipe';

@Component({
    selector: 'sl-maatregel-item',
    standalone: true,
    templateUrl: './maatregel-item.component.html',
    styleUrls: ['./maatregel-item.component.scss'],
    imports: [SlDatePipe, IconDirective, MaatregelItemAriaLabelPipe],
    providers: [provideIcons(IconReacties)]
})
export class MaatregelItemComponent {
    @Input({ required: true }) toekenning: SMaatregelToekenning;
}
