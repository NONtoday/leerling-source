import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, TemplateRef, ViewContainerRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import {
    CheckboxComponent,
    DeviceService,
    GeenDataComponent,
    IconDirective,
    OverlayService,
    SpinnerComponent,
    SwitchComponent,
    SwitchGroupComponent,
    TabComponent,
    TooltipDirective,
    VakIconComponent,
    isPresent,
    shareReplayLastValue
} from 'harmony';
import { IconPijlLinks, IconZichtbaar, provideIcons } from 'harmony-icons';
import { RouterService, VAKRESULATEN_BACK_URL, VAKRESULTATEN_PARAMETERS } from 'leerling-base';
import { HeaderService } from 'leerling-header';

import { AccessibilityService, CONTENT_TAB_INDEX, RefreshReason, onRefresh } from 'leerling-util';
import { Observable, Subject, combineLatest, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';
import { CijfersService } from '../../../services/cijfers/cijfers.service';
import { VakToetsdossier } from '../../../services/vakresultaten/vakresultaten-model';
import { VakResultatenService } from '../../../services/vakresultaten/vakresultaten.service';
import { ExamenresultatenComponent } from '../examenresultaten/examenresultaten.component';
import { VoortgangsresultatenComponent } from '../voortgangsresultaten/voortgangsresultaten.component';
import { HeeftAndereVakResultaten } from './heeft-andere-vak-resultaten.pipe';
import { HeeftVakResultaten } from './heeft-vak-resultaten.pipe';
import { TabNaamPipe } from './tab-naam.pipe';
export type VakResultaatTab = 'Rapport' | 'Examen' | 'Standaard' | 'Alternatief';

@Component({
    selector: 'sl-vakresultaten',
    imports: [
        CommonModule,
        SpinnerComponent,
        SwitchGroupComponent,
        SwitchComponent,
        TabComponent,
        TabNaamPipe,
        VoortgangsresultatenComponent,
        ExamenresultatenComponent,
        IconDirective,
        TooltipDirective,
        GeenDataComponent,
        HeeftVakResultaten,
        HeeftAndereVakResultaten,
        VakIconComponent,
        CheckboxComponent,
        CdkTrapFocus
    ],
    templateUrl: './vakresultaten.component.html',
    styleUrls: ['./vakresultaten.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconPijlLinks, IconZichtbaar)]
})
export class VakresultatenComponent implements OnInit, OnDestroy {
    private _accessibilityService = inject(AccessibilityService);
    private _vakResultatenService = inject(VakResultatenService);
    private _routerService = inject(RouterService);
    private _activatedRoute = inject(ActivatedRoute);
    private _cijfersService = inject(CijfersService);
    private _headerService = inject(HeaderService);
    private _overlayService = inject(OverlayService);
    private _deviceService = inject(DeviceService);
    private _vakNaamFallBack: string | null;
    private _router = inject(Router);

    private destroy$ = new Subject<void>();

    public vakresultatenView$: Observable<VakresultatenView | undefined>;
    public metResultaatKolommen = this._cijfersService.toonLegeResultaatKolommen;
    private _metResultaatKolommen$ = toObservable(this.metResultaatKolommen);

    isPhoneOrTabletSignal = this._deviceService.isPhoneOrTabletSignal;
    resultatenFilter = viewChild('resultatenFilter', { read: ViewContainerRef });
    filterOptionsTemplate = viewChild('filterOptions', { read: TemplateRef });
    filterMobileIcon = viewChild('filterMobileIcon', { read: TemplateRef });
    filterTabletIconViewContainer = viewChild('tabletFilterIcon', { read: ViewContainerRef });

    constructor() {
        this._headerService.backButtonClicked$.pipe(takeUntilDestroyed()).subscribe(() => {
            this.onBackButtonClick();
        });

        onRefresh((reason) => {
            if (reason === RefreshReason.LEERLING_SWITCH) this._routerService.routeToCijfers();
        });
    }

    ngOnInit(): void {
        const vakToetsdossier$ = combineLatest([
            this._activatedRoute.queryParamMap.pipe(
                map((params) => {
                    const vakUuid = params.get(VAKRESULTATEN_PARAMETERS.VAK_UUID);
                    const lichtingUuid = params.get(VAKRESULTATEN_PARAMETERS.LICHTING_UUID);
                    this._vakNaamFallBack = params.get(VAKRESULTATEN_PARAMETERS.VAK_NAAM);
                    if (!vakUuid || !lichtingUuid) {
                        return undefined;
                    }
                    return {
                        vakUuid,
                        lichtingUuid,
                        plaatsingUuid: params.get(VAKRESULTATEN_PARAMETERS.PLAATSING_UUID) ?? undefined
                    };
                }),
                filter(isPresent)
            ),
            this._metResultaatKolommen$
        ]).pipe(
            switchMap(([vakLichtingPlaatsing, metKolommen]) => {
                return this._vakResultatenService.getVakToetsdossier(
                    vakLichtingPlaatsing.vakUuid,
                    vakLichtingPlaatsing.lichtingUuid,
                    vakLichtingPlaatsing.plaatsingUuid,
                    metKolommen
                );
            }),
            map((dossier: VakToetsdossier) => {
                if (dossier === undefined) return dossier;
                if (!dossier.vakNaam) dossier.vakNaam = this._vakNaamFallBack || '';
                return dossier;
            }),
            tap((dossier) => {
                if (dossier === undefined) return;
                this._cijfersService.setScrollableTitle(
                    dossier.voortgangsdossier?.vaknaam || dossier.examendossier?.vaknaam || dossier.vakNaam
                );
            })
        );

        const tabParameter$ = this._activatedRoute.queryParamMap.pipe(
            map((map) => (map.get(VAKRESULTATEN_PARAMETERS.ACTIEVE_TAB) as VakResultaatTab) || 'Rapport'),
            distinctUntilChanged(),
            shareReplayLastValue()
        );

        const tabs$: Observable<VakResultaatTab[]> = vakToetsdossier$.pipe(
            map((vakToetsdossier) => this.getMogelijkeTabs(vakToetsdossier)),
            shareReplayLastValue()
        );

        const actieveTab$: Observable<VakResultaatTab> = combineLatest([tabs$, tabParameter$]).pipe(
            map(([tabs, tabParameter]) => {
                if (tabs.includes(tabParameter)) return tabParameter;

                return tabs[0];
            }),
            shareReplayLastValue()
        );

        this.vakresultatenView$ = combineLatest([vakToetsdossier$, tabs$, actieveTab$]).pipe(
            map(([vakToetsdossier, tabs, actieveTab]) => {
                return {
                    vakToetsdossier: vakToetsdossier,
                    tabs: tabs,
                    actieveTab: actieveTab
                } as VakresultatenView;
            })
        );

        this._accessibilityService.focusAfterLoad(
            this.vakresultatenView$,
            (view) => !!view?.vakToetsdossier,
            CONTENT_TAB_INDEX,
            this.destroy$
        );

        this._headerService.heeftBackButton = true;

        this._headerService.actionIcons.set(this.filterMobileIcon());
    }

    private getMogelijkeTabs(vakToetsdossier: VakToetsdossier): VakResultaatTab[] {
        const tabs: VakResultaatTab[] = [];

        if (vakToetsdossier === undefined) return tabs;
        if (
            vakToetsdossier.voortgangsdossier?.standaardNiveau?.heeftResultaten ||
            vakToetsdossier.voortgangsdossier?.alternatiefNiveau?.heeftResultaten
        ) {
            if (vakToetsdossier.voortgangsdossier?.alternatiefNiveau?.heeftResultaten) {
                tabs.push('Standaard');
                tabs.push('Alternatief');
            } else {
                tabs.push('Rapport');
            }
        }
        const examenDossier = vakToetsdossier.examendossier;
        if (examenDossier && (this.metResultaatKolommen() ? examenDossier.heeftResultaten : examenDossier.resultaten.length > 0)) {
            tabs.push('Examen');
        }

        if (tabs.length === 0) {
            tabs.push('Rapport');
        }
        return tabs;
    }

    selectTab(tab: VakResultaatTab) {
        this._router.navigate([], {
            queryParams: {
                tab: tab
            },
            queryParamsHandling: 'merge',
            relativeTo: this._activatedRoute
        });
    }

    public async onBackButtonClick() {
        const backUrl = await Preferences.get({ key: VAKRESULATEN_BACK_URL });
        this._router.navigateByUrl(backUrl.value ?? '/cijfers');
    }

    ngOnDestroy(): void {
        this._cijfersService.reset();
        this._headerService.heeftBackButton = false;
        this._headerService.actionIcons.set(undefined);
        Preferences.remove({ key: VAKRESULATEN_BACK_URL });
        this.destroy$.next();
        this.destroy$.complete();
    }

    flipKolommen(event: Event) {
        event.stopPropagation();
        this.metResultaatKolommen.set(!this.metResultaatKolommen());
    }
    openFilter() {
        const attachToElement = this._deviceService.isPhoneOrTablet() ? this.filterTabletIconViewContainer() : this.resultatenFilter();
        const filterOptionsTemplate = this.filterOptionsTemplate();
        if (!attachToElement || !filterOptionsTemplate) {
            return;
        }
        if (this._overlayService.isOpen(attachToElement)) {
            this._overlayService.close(attachToElement);
            return;
        }

        this._overlayService.popupOrModal({
            template: filterOptionsTemplate,
            element: attachToElement,
            popupSettings: { width: '280px' },
            modalSettings: { contentPadding: 0 }
        });
    }
}

export interface VakresultatenView {
    vakToetsdossier: VakToetsdossier;
    tabs: VakResultaatTab[];
    actieveTab: VakResultaatTab;
}
