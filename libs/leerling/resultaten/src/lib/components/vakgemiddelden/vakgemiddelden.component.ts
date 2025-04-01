import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, Pipe, PipeTransform, inject } from '@angular/core';
import { GeenDataComponent, SpinnerComponent, isPresent } from 'harmony';
import { RouterService } from 'leerling-base';
import { AccessibilityService, DropdownComponent, DropdownConfig, DropdownItem, onRefresh } from 'leerling-util';
import {
    PlaatsingService,
    SPlaatsing,
    SVakkeuzeGemiddelde,
    SVakkeuzeGemiddelden,
    VakkeuzeService,
    getPlaatsingOmschrijving
} from 'leerling/store';
import { orderBy } from 'lodash-es';
import { BehaviorSubject, Observable, Subject, filter, switchMap } from 'rxjs';
import { CijfersService } from '../../services/cijfers/cijfers.service';
import { VakgemiddeldeItemComponent } from '../vakgemiddelde-item/vakgemiddelde-item.component';

@Pipe({ name: 'plaatsingDropdownItem', standalone: true })
export class PlaatsingDropdownItemPipe implements PipeTransform {
    transform(plaatsingen: SPlaatsing[]): DropdownItem<SPlaatsing>[] {
        return plaatsingen.map((plaatsing) => {
            return {
                label: getPlaatsingOmschrijving(plaatsing),
                identifier: plaatsing.UUID,
                data: plaatsing
            };
        });
    }
}

const DROPDOWN_CONFIG: DropdownConfig<SPlaatsing> = {
    geenItemLabel: 'Geen plaatsing',
    getDefaultItemFn: (items: DropdownItem<SPlaatsing>[]) => items.find((plaatsingitem) => plaatsingitem.data.huidig),
    sorteerItemsFn: (items: DropdownItem<SPlaatsing>[]) => orderBy(items, (plaatsingitem) => plaatsingitem.data.vanafDatum, 'desc')
};

@Component({
    selector: 'sl-vakgemiddelden',
    imports: [CommonModule, VakgemiddeldeItemComponent, SpinnerComponent, GeenDataComponent, PlaatsingDropdownItemPipe, DropdownComponent],
    templateUrl: './vakgemiddelden.component.html',
    styleUrls: ['./vakgemiddelden.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VakgemiddeldenComponent implements OnDestroy, OnInit {
    private _plaatsingService = inject(PlaatsingService);
    private _vakkeuzeService = inject(VakkeuzeService);
    private _routerService = inject(RouterService);
    private _cijfersService = inject(CijfersService);
    private _accessibilityService = inject(AccessibilityService);
    private _changeDetector = inject(ChangeDetectorRef);
    private destroy$ = new Subject<void>();

    private _geselecteerdePlaatsingSubject = new BehaviorSubject<SPlaatsing | undefined>(undefined);

    public plaatsingen$: Observable<SPlaatsing[] | undefined> = this._plaatsingService.getPlaatsingen();

    public plaatsingComponentTabindex = 110;

    public dropdownConfig = DROPDOWN_CONFIG;

    public vakkeuzesVoorPlaatsing$: Observable<SVakkeuzeGemiddelden | undefined> = this._geselecteerdePlaatsingSubject.pipe(
        filter(isPresent),
        switchMap((plaatsing) => this._vakkeuzeService.getVakkeuzesMetGemiddelden(plaatsing.UUID))
    );

    constructor() {
        onRefresh(() => this._plaatsingService.refreshPlaatsingen());
    }

    ngOnInit(): void {
        this._cijfersService.setCijfersMetTabs();

        this._accessibilityService.focusAfterLoad(this.vakkeuzesVoorPlaatsing$, (view) => !!view, 101, this.destroy$);
    }

    ngOnDestroy(): void {
        this._cijfersService.reset();
        this.destroy$.next();
        this.destroy$.complete();
    }

    public selecteerPlaatsing(plaatsing: DropdownItem<SPlaatsing> | undefined) {
        this._geselecteerdePlaatsingSubject.next(plaatsing?.data);
        this._changeDetector.detectChanges();
    }

    public onVakgemiddeldeClick(vakkeuzeGemiddelde: SVakkeuzeGemiddelde) {
        const vakkeuze = vakkeuzeGemiddelde.vakkeuze;
        this._routerService.routeToCijfersVakresultaten(
            vakkeuze.vak.uuid,
            vakkeuze.lichtingUuid,
            this._geselecteerdePlaatsingSubject.value?.UUID,
            undefined,
            vakkeuze.vak.naam
        );
    }
}
