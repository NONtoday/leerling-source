import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, WritableSignal, inject, input, output, signal } from '@angular/core';
import { ButtonComponent, DeviceService, IconDirective, PillComponent, VakIconComponent } from 'harmony';
import { Observable } from 'rxjs';

import { collapseOnLeaveAnimation, expandOnEnterAnimation } from 'angular-animations';
import { IconChevronRechts, IconHerkansing, IconToets, IconWeging, provideIcons } from 'harmony-icons';
import { FULL_SCREEN_MET_MARGIN, ModalSettings, createModalSettings } from 'leerling-util';
import { ResultaatItemDetailDeeltoetsenComponent } from '../resultaat-item-detail-deeltoetsen/resultaat-item-detail-deeltoetsen.component';
import { ResultaatItemDetailHerkansingGeldendComponent } from '../resultaat-item-detail-herkansing-geldend/resultaat-item-detail-herkansing-geldend.component';
import { ResultaatItemDetailHerkansingLijstComponent } from '../resultaat-item-detail-herkansing-lijst/resultaat-item-detail-herkansing-lijst.component';
import { ResultaatItemDetailSamengsteldeToetsComponent } from '../resultaat-item-detail-samengestelde-toets/resultaat-item-detail-samengestelde-toets.component';
import { ResultaatItem } from '../resultaat-item-model';
import { ResultaatItemAriaLabelPipe } from './resultaat-item-label.pipe';

const ANIMATIONS = [collapseOnLeaveAnimation(), expandOnEnterAnimation()];

@Component({
    selector: 'sl-resultaat-item-detail',
    imports: [
        CommonModule,
        IconDirective,
        ButtonComponent,
        PillComponent,
        ResultaatItemDetailDeeltoetsenComponent,
        ResultaatItemDetailHerkansingLijstComponent,
        ResultaatItemDetailSamengsteldeToetsComponent,
        ResultaatItemDetailHerkansingGeldendComponent,
        ResultaatItemAriaLabelPipe,
        VakIconComponent
    ],
    templateUrl: './resultaat-item-detail.component.html',
    styleUrls: ['./resultaat-item-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconToets, IconWeging, IconHerkansing, IconChevronRechts)],
    animations: ANIMATIONS
})
export class ResultaatItemDetailComponent {
    public deviceService = inject(DeviceService);

    public toonTitel = input.required<boolean>();
    public toonVakIcon = input<boolean>(true);
    public resultaatItem = input.required<ResultaatItem>();
    public toonVakCijferlijstKnop = input<boolean>(false);
    public toonKolommen = input<boolean>(false);

    openVakCijferlijst = output<void>();

    public isTabletOrDesktop$: Observable<boolean> = inject(DeviceService).isTabletOrDesktop$;

    public isShown: WritableSignal<boolean> = signal(false);

    public toggleShown(event: Event) {
        event.stopPropagation();
        this.isShown.set(!this.isShown());
    }
    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            heightRollup: 'unset',
            maxHeightRollup: FULL_SCREEN_MET_MARGIN,
            showClose: true
        });
    }
}
