import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, inject } from '@angular/core';
import { DeviceService, IconDirective, SpinnerComponent } from 'harmony';
import { IconPijlRechts, provideIcons } from 'harmony-icons';
import { Observable, combineLatest, map } from 'rxjs';
import { SamengesteldeToetsDetails } from '../../../services/laatsteresultaten/laatsteresultaten-model';
import { LaatsteResultatenService } from '../../../services/laatsteresultaten/laatsteresultaten.service';
import { ResultaatItemDetails } from '../resultaat-item-model';

@Component({
    selector: 'sl-resultaat-item-detail-samengstelde-toets',
    standalone: true,
    imports: [CommonModule, IconDirective, SpinnerComponent],
    templateUrl: './resultaat-item-detail-samengestelde-toets.component.html',
    styleUrls: ['./resultaat-item-detail-samengestelde-toets.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconPijlRechts)]
})
export class ResultaatItemDetailSamengsteldeToetsComponent implements OnChanges {
    @Input({ required: true }) public details: ResultaatItemDetails;

    private _deviceService = inject(DeviceService);
    private _laatsteResultatenService = inject(LaatsteResultatenService);

    public details$: Observable<{
        isTabletOrDesktop: boolean;
        value: SamengesteldeToetsDetails | undefined;
    }>;

    ngOnChanges(): void {
        const samengesteldeToetsDetails$ = this._laatsteResultatenService.getSamengesteldeToetsDetails(
            this.details.dossierType,
            this.details.resultaatkolomId,
            this.details.isAlternatief ?? false
        );

        this.details$ = combineLatest([samengesteldeToetsDetails$, this._deviceService.onDeviceChange$]).pipe(
            map(([samengesteldeToetsDetails]) => ({
                isTabletOrDesktop: this._deviceService.isTabletOrDesktop(),
                value: samengesteldeToetsDetails
            }))
        );
    }
}
