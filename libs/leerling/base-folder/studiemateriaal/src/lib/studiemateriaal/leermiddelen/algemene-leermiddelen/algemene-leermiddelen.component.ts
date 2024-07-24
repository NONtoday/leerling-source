import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { SpinnerComponent } from 'harmony';
import { BijlageComponent } from 'leerling-base';
import { ConnectGebruikService } from 'leerling-connect';
import { FULL_SCREEN_MET_MARGIN, ModalSettings, SidebarSettings, createModalSettings, createSidebarSettings } from 'leerling-util';
import { Leermiddel } from '../../../studiemateriaal-frontend-model';

@Component({
    selector: 'sl-algemene-leermiddelen',
    standalone: true,
    imports: [CommonModule, BijlageComponent, SpinnerComponent],
    templateUrl: './algemene-leermiddelen.component.html',
    styleUrl: './algemene-leermiddelen.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlgemeneLeermiddelenComponent {
    private _connectGebruikService = inject(ConnectGebruikService);

    public leermiddelen = input.required<Leermiddel[] | undefined>();

    public registreerGebruik(leermiddel: Leermiddel) {
        this._connectGebruikService.registreerLeermiddelGebruik(leermiddel);
    }

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getSidebarSettings(onClose?: () => void): SidebarSettings {
        return createSidebarSettings({
            title: 'Algemene leermiddelen',
            headerType: 'normal',
            onClose
        });
    }
}
