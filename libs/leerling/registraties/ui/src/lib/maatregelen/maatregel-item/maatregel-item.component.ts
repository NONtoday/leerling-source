import { Component, Input } from '@angular/core';
import { HmyDatePipe, IconDirective } from 'harmony';
import { IconReacties, provideIcons } from 'harmony-icons';
import { SMaatregelToekenning } from 'leerling/store';
import { MaatregelItemAriaLabelPipe } from './maatregel-item-aria-label.pipe';

@Component({
    selector: 'sl-maatregel-item',
    templateUrl: './maatregel-item.component.html',
    styleUrls: ['./maatregel-item.component.scss'],
    imports: [HmyDatePipe, IconDirective, MaatregelItemAriaLabelPipe],
    providers: [provideIcons(IconReacties)]
})
export class MaatregelItemComponent {
    @Input({ required: true }) toekenning: SMaatregelToekenning;
}
