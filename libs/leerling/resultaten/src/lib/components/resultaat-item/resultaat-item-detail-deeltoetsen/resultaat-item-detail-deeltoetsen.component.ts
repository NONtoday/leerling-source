import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, inject } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { collapseOnLeaveAnimation, expandOnEnterAnimation } from 'angular-animations';
import { IconDirective, SpinnerComponent } from 'harmony';
import { DossierType, SGeldendResultaat } from 'leerling/store';
import { orderBy } from 'lodash-es';
import { Observable, map, switchMap } from 'rxjs';
import { VakResultatenService } from '../../../services/vakresultaten/vakresultaten.service';
import { ResultaatItemComponent } from '../resultaat-item/resultaat-item.component';
import { DeeltoetsToResultaatItemPipe } from './deeltoets-to-resultaatItem.pipe';

const ANIMATIONS = [collapseOnLeaveAnimation(), expandOnEnterAnimation()];
@Component({
    selector: 'sl-resultaat-item-detail-deeltoetsen',
    standalone: true,
    imports: [CommonModule, IconDirective, ResultaatItemComponent, DeeltoetsToResultaatItemPipe, SpinnerComponent],
    templateUrl: './resultaat-item-detail-deeltoetsen.component.html',
    styleUrls: ['./resultaat-item-detail-deeltoetsen.component.scss'],
    animations: ANIMATIONS,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultaatItemDetailDeeltoetsenComponent implements OnInit {
    @Input({ required: true }) dossierType: DossierType;
    @Input({ required: true }) samengesteldeResultaatkolomId: number;
    @Input({ required: true }) isAlternatieveNormering: boolean;

    private _activatedRoute = inject(ActivatedRoute);
    private _vakResultatenService = inject(VakResultatenService);

    public deeltoetsen$: Observable<SGeldendResultaat[] | undefined>;

    ngOnInit(): void {
        this.deeltoetsen$ = this._activatedRoute.queryParamMap.pipe(
            map((queryParamMap: ParamMap) => queryParamMap.get('plaatsingUuid') ?? undefined),
            switchMap((plaatsingUuid) =>
                this._vakResultatenService.getSamengesteldeToetsDetails(this.dossierType, this.samengesteldeResultaatkolomId, plaatsingUuid)
            ),
            map((deeltoetsen) => orderBy(deeltoetsen, ['datumInvoerEerstePoging'], ['desc']))
        );
    }
}
