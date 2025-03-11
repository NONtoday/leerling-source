import { CommonModule, I18nPluralPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, QueryList, ViewChildren, inject, input, output } from '@angular/core';
import { StudiewijzerItemComponent } from 'leerling-studiewijzer-api';
import { SStudiewijzerItem, SwiToekenningType } from 'leerling/store';

@Component({
    selector: 'sl-rooster-huiswerk-dropdown-items',
    standalone: true,
    imports: [CommonModule, StudiewijzerItemComponent, I18nPluralPipe],
    templateUrl: './rooster-huiswerk-dropdown-items.component.html',
    styleUrl: './rooster-huiswerk-dropdown-items.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterHuiswerkDropdownItemsComponent {
    @ViewChildren(StudiewijzerItemComponent) studiewijzerItems: QueryList<StudiewijzerItemComponent>;

    public elementRef = inject(ElementRef);

    public items = input.required<SStudiewijzerItem[]>();
    public toekenningsType = input.required<SwiToekenningType>();
    public baseTabIndex = input(0);

    itemSelected = output<SStudiewijzerItem>();
}
