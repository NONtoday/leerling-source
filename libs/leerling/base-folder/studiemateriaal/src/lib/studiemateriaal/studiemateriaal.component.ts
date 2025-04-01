import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { GeenDataComponent, SpinnerComponent, getIconVoorVak } from 'harmony';
import { DEFAULT_AANTAL_LESSTOF_ITEMS, LesstofComponent } from 'leerling-lesstof';
import { FULL_SCREEN_MET_MARGIN, ModalSettings, SidebarSettings, createModalSettings, createSidebarSettings } from 'leerling-util';
import { SLesgroep, SVak } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { StudiemateriaalService } from '../studiemateriaal.service';
import { JaarbijlagenComponent } from './jaarbijlagen/jaarbijlagen.component';
import { LeermiddelenComponent } from './leermiddelen/leermiddelen.component';

@Component({
    selector: 'sl-studiemateriaal',
    imports: [CommonModule, SpinnerComponent, JaarbijlagenComponent, LeermiddelenComponent, LesstofComponent, GeenDataComponent],
    templateUrl: './studiemateriaal.component.html',
    styleUrl: './studiemateriaal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiemateriaalComponent {
    private _studiemateriaalService = inject(StudiemateriaalService);

    public vak = input<SVak>();
    public lesgroep = input<SLesgroep>();
    public toonAlgemeneLeermiddelen = input<boolean>(true);

    public aantalLesstofItems = signal(DEFAULT_AANTAL_LESSTOF_ITEMS);

    public studiemateriaal = derivedAsync(() =>
        this._studiemateriaalService.getStudiemateriaal(this.vak()?.uuid, this.lesgroep()?.uuid, this.aantalLesstofItems())
    );

    public heeftLesstof = computed(() => (this.studiemateriaal()?.lesstof?.totaalAantalLesstof ?? 0) > 0);
    public heeftLeermiddelen = computed(() => {
        const leermiddelen = this.studiemateriaal()?.leermiddelen;
        return (
            leermiddelen &&
            ((this.toonAlgemeneLeermiddelen() && leermiddelen.algemeneLeermiddelen.length > 0) || leermiddelen?.leermiddelen.length > 0)
        );
    });
    public heeftJaarbijlagen = computed(() => {
        const jaarbijlagen = this.studiemateriaal()?.jaarbijlagen;
        return jaarbijlagen && (jaarbijlagen.jaarbijlagen.length > 0 || jaarbijlagen?.mappen.length > 0);
    });
    public geenMateriaal = computed(() => !this.heeftLesstof() && !this.heeftLeermiddelen() && !this.heeftJaarbijlagen());

    public setAantalLesstofItems(value: number) {
        this.aantalLesstofItems.set(value);
    }

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getSidebarSettings(vak?: SVak, onClose?: () => void): SidebarSettings {
        return createSidebarSettings({
            title: vak?.naam ?? 'Studiemateriaal',
            headerType: 'normal',
            vakIcon: vak ? getIconVoorVak(vak.naam ?? '') : undefined,
            onClose
        });
    }
}
