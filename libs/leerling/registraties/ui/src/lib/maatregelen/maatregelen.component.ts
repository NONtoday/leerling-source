import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconPillComponent, SpinnerComponent } from 'harmony';
import { IconMaatregel, provideIcons } from 'harmony-icons';
import { SMaatregelToekenning } from 'leerling/store';
import { MaatregelItemComponent } from './maatregel-item/maatregel-item.component';

@Component({
    selector: 'sl-maatregelen',
    standalone: true,
    imports: [CommonModule, SpinnerComponent, IconPillComponent, MaatregelItemComponent],
    providers: [provideIcons(IconMaatregel)],
    templateUrl: './maatregelen.component.html',
    styleUrl: './maatregelen.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaatregelenComponent {
    maatregelToekenningen = input.required<SMaatregelToekenning[] | undefined>();
    aantalMaatregelen = computed(() => this.maatregelToekenningen()?.length ?? 0);
    heeftMaatregelen = computed(() => this.aantalMaatregelen() > 0);
}
