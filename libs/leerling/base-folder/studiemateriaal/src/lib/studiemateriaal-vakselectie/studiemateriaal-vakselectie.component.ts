import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SpinnerComponent, VakIconComponent } from 'harmony';
import {
    FULL_SCREEN_MET_MARGIN,
    GeenDataComponent,
    ModalSettings,
    SidebarService,
    SidebarSettings,
    createModalSettings,
    createSidebarSettings
} from 'leerling-util';
import { SVak } from 'leerling/store';
import { StudiemateriaalService } from '../studiemateriaal.service';
import { AlgemeneLeermiddelenComponent } from '../studiemateriaal/leermiddelen/algemene-leermiddelen/algemene-leermiddelen.component';
import { StudiemateriaalComponent } from '../studiemateriaal/studiemateriaal.component';

@Component({
    selector: 'sl-studiemateriaal-vakselectie',
    imports: [CommonModule, SpinnerComponent, GeenDataComponent, VakIconComponent],
    templateUrl: './studiemateriaal-vakselectie.component.html',
    styleUrl: './studiemateriaal-vakselectie.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiemateriaalVakselectieComponent {
    private _sidebarService = inject(SidebarService);
    private _studiemateriaalService = inject(StudiemateriaalService);

    public vakken = toSignal(this._studiemateriaalService.getVakkenMetStudiemateriaal());
    private algemeneLeermiddelen = toSignal(this._studiemateriaalService.getAlgemeneLeermiddelen());
    public heeftAlgemeneLeermiddelen = computed(() => {
        const algemeneLeermiddelen = this.algemeneLeermiddelen();
        return algemeneLeermiddelen ? algemeneLeermiddelen.length > 0 : false;
    });
    public geenMateriaal = computed(() => !this.heeftAlgemeneLeermiddelen() && this.vakken()?.length == 0);

    public openAlgemeneLeermiddelen() {
        this._sidebarService.push(
            AlgemeneLeermiddelenComponent,
            { leermiddelen: this.algemeneLeermiddelen() },
            AlgemeneLeermiddelenComponent.getSidebarSettings()
        );
    }

    public openStudiemateriaal(vak: SVak) {
        this._sidebarService.push(
            StudiemateriaalComponent,
            { vak: vak, lesgroep: undefined, toonAlgemeneLeermiddelen: false },
            StudiemateriaalComponent.getSidebarSettings(vak)
        );
    }

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getSidebarSettings(onClose?: () => void): SidebarSettings {
        return createSidebarSettings({
            title: 'Studiemateriaal',
            headerType: 'normal',
            onClose
        });
    }
}
