import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { FULL_SCREEN_MET_MARGIN, ModalSettings, createModalSettings, createPopupSettings } from 'leerling-util';
import { SStudiewijzerItem } from 'leerling/store';
import { RoosterHuiswerkDropdownItemsComponent } from '../rooster-huiswerk-dropdown-items/rooster-huiswerk-dropdown-items.component';

@Component({
    selector: 'sl-rooster-huiswerk-stack-detail',
    standalone: true,
    imports: [CommonModule, RoosterHuiswerkDropdownItemsComponent],
    templateUrl: './rooster-huiswerk-stack-detail.component.html',
    styleUrl: './rooster-huiswerk-stack-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterHuiswerkStackDetailComponent {
    public dagItems = input.required<SStudiewijzerItem[]>();
    public weekItems = input.required<SStudiewijzerItem[]>();
    public datum = input<Date | undefined>(undefined);
    public baseTabIndex = input(0);

    itemSelected = output<SStudiewijzerItem>();

    public titel = computed(() => {
        const datum = this.datum();
        return datum ? format(datum, 'EEEE d MMMM', { locale: nl }).replace(/^\w/, (c) => c.toUpperCase()) : undefined;
    });

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getPopupSettings(width: number) {
        return createPopupSettings({
            width: `${Math.max(width, 256)}px`,
            maxHeight: '380px',
            animation: 'slide',
            alignment: 'start'
        });
    }
}
