import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { SpinnerComponent, isPresent } from 'harmony';
import { RouterService } from 'leerling-base';
import { AccessibilityService, GeenDataComponent, PLAATSING_COMPONENT_TABINDEX, PlaatsingenComponent, onRefresh } from 'leerling-util';
import { PlaatsingService, SPlaatsing, SVakkeuzeGemiddelde, SVakkeuzeGemiddelden, VakkeuzeService } from 'leerling/store';
import { BehaviorSubject, Observable, Subject, filter, switchMap } from 'rxjs';
import { CijfersService } from '../../services/cijfers/cijfers.service';
import { VakgemiddeldeItemComponent } from '../vakgemiddelde-item/vakgemiddelde-item.component';

@Component({
    selector: 'sl-vakgemiddelden',
    standalone: true,
    imports: [CommonModule, PlaatsingenComponent, VakgemiddeldeItemComponent, SpinnerComponent, GeenDataComponent],
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

    public plaatsingComponentTabindex = PLAATSING_COMPONENT_TABINDEX;

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

    public selecteerPlaatsing(plaatsing: SPlaatsing | undefined) {
        this._geselecteerdePlaatsingSubject.next(plaatsing);
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
