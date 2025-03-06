import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, inject } from '@angular/core';
import { DeviceService, IconDirective } from 'harmony';
import { IconPijlRechts, provideIcons } from 'harmony-icons';
import { ResultaatGeldend } from '../resultaat-item-model';

@Component({
    selector: 'sl-resultaat-item-detail-herkansing-geldend',
    imports: [CommonModule, IconDirective],
    templateUrl: './resultaat-item-detail-herkansing-geldend.component.html',
    styleUrls: ['./resultaat-item-detail-herkansing-geldend.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconPijlRechts)]
})
export class ResultaatItemDetailHerkansingGeldendComponent implements OnChanges {
    @Input({ required: true }) public geldend: ResultaatGeldend;

    public isTablerOrDesktop$ = inject(DeviceService).isTabletOrDesktop$;
    public geldendePoging: string;

    ngOnChanges(): void {
        this.updateGeldendePoging();
    }

    private updateGeldendePoging() {
        if (['EenkeerGemiddeld', 'TweeKeerGemiddeld'].includes(this.geldend.herkansingssoort)) {
            this.geldendePoging = 'Gemiddelde';
        } else {
            const poging = this.geldend.poging || 0;
            switch (poging) {
                case 1:
                    this.geldendePoging = 'Eerste herkansing';
                    break;
                case 2:
                    this.geldendePoging = 'Tweede herkansing';
                    break;
                default:
                    this.geldendePoging = 'Eerste poging';
                    break;
            }
        }
    }
}
