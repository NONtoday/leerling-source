import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SpinnerComponent } from 'harmony';
import {
    AccessibilityService,
    createModalSettings,
    createSidebarSettings,
    FULL_SCREEN_MET_MARGIN,
    GeenDataComponent,
    ModalSettings,
    SidebarService,
    SidebarSettings
} from 'leerling-util';
import { InleveropdrachtCategorie, InleveropdrachtListService, SStudiewijzerItem } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { of } from 'rxjs';
import { StudiewijzerItemDetailComponent } from '../../studiewijzer-item-detail/studiewijzer-item-detail.component';
import { InleveringMapComponent } from '../inlevering-map/inlevering-map.component';

@Component({
    selector: 'sl-inleveringen-list',
    imports: [CommonModule, InleveringMapComponent, GeenDataComponent, SpinnerComponent],
    templateUrl: './inleveringen-list.component.html',
    styleUrl: './inleveringen-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InleveringenListComponent {
    private _accessibilityService = inject(AccessibilityService);
    private _sidebarService = inject(SidebarService);
    private _InleveropdrachtListService = inject(InleveropdrachtListService);

    public inleverStatussen: InleveropdrachtCategorie[] = ['AANKOMEND', 'IN_TE_LEVEREN', 'IN_AFWACHTING', 'AKKOORD'];
    public inleverOpdrachten = derivedAsync(() => this._InleveropdrachtListService.getInleverOpdrachten());

    public openInleverOpdracht(inleverOpdracht: SStudiewijzerItem) {
        this._sidebarService.push(
            StudiewijzerItemDetailComponent,
            computed(() => ({
                item: this.inleverOpdrachten()?.find((item) => item.id === inleverOpdracht.id) ?? inleverOpdracht,
                showBackButton: true
            })),
            StudiewijzerItemDetailComponent.getSidebarSettings(inleverOpdracht, this._sidebarService, false, () =>
                this._onHuiswerkDetailsClose()
            )
        );
        this._sidebarService.registerCloseGuard(
            StudiewijzerItemDetailComponent,
            () => this._sidebarService.getSidebarComponent(StudiewijzerItemDetailComponent)?.canDeactivate() ?? of(true),
            ['backdrop-click', 'escape-key', 'page-back']
        );
    }

    private _onHuiswerkDetailsClose(): void {
        if (this._accessibilityService.isAccessedByKeyboard()) {
            this._accessibilityService.resetFocusState();
        }
    }

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getSidebarSettings(onClose?: () => void): SidebarSettings {
        return createSidebarSettings({
            title: 'Inleveropdrachten',
            titleIcon: { name: 'inleveropdracht', color: 'fg-alternative-normal' },
            headerType: 'normal',
            headerDevice: 'all',
            onClose
        });
    }
}
