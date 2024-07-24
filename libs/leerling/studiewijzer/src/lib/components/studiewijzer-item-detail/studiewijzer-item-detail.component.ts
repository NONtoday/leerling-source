import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TabInput, TabRowComponent } from 'harmony';
import { StudiemateriaalComponent } from 'leerling-studiemateriaal';
import { StudiewijzerItemInstructieComponent, getVakOfLesgroepNaam } from 'leerling-studiewijzer-api';
import { FULL_SCREEN_MET_MARGIN, ModalSettings, SidebarSettings, createModalSettings, createSidebarSettings } from 'leerling-util';
import { SStudiewijzerItem } from 'leerling/store';

const MODUS = ['Instructie', 'Studiemateriaal'] as const;
const TABS: TabInput[] = MODUS.map((label) => ({ label }));
type Modus = (typeof MODUS)[number];

@Component({
    selector: 'sl-studiewijzer-item-detail',
    standalone: true,
    imports: [CommonModule, StudiewijzerItemInstructieComponent, StudiemateriaalComponent, TabRowComponent],
    templateUrl: './studiewijzer-item-detail.component.html',
    styleUrl: './studiewijzer-item-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerItemDetailComponent {
    public item = input.required<SStudiewijzerItem>();

    public modus = signal('Instructie' as Modus);
    public tabs = TABS;

    public onTabSwitch(tab: string) {
        this.modus.set(tab as Modus);
    }

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getSidebarSettings(huiswerk: SStudiewijzerItem, onClose?: () => void): SidebarSettings {
        return createSidebarSettings({
            title: getVakOfLesgroepNaam(huiswerk) ?? '',
            headerType: 'borderless',
            vakIcon: huiswerk.vak?.naam ?? huiswerk.vak?.afkorting ?? '',
            onClose
        });
    }
}
