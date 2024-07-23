import { CommonModule, I18nPluralPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { StudiewijzerItemComponent } from 'leerling-studiewijzer-api';
import { SStudiewijzerItem, SwiToekenningType } from 'leerling/store';
import { pluralMapping } from '../plural-mapping';

@Component({
    selector: 'sl-rooster-huiswerk-dropdown-items',
    standalone: true,
    imports: [CommonModule, StudiewijzerItemComponent, I18nPluralPipe],
    templateUrl: './rooster-huiswerk-dropdown-items.component.html',
    styleUrl: './rooster-huiswerk-dropdown-items.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterHuiswerkDropdownItemsComponent {
    public items = input.required<SStudiewijzerItem[]>();
    public toekenningsType = input.required<SwiToekenningType>();
    public baseTabIndex = input(0);

    public pluralMapping = pluralMapping;

    itemSelected = output<SStudiewijzerItem>();
}
