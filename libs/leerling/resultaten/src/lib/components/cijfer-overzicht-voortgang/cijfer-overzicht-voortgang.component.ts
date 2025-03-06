import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { isWithinInterval } from 'date-fns';
import { IconDirective, IconPillComponent, SpinnerComponent, TooltipDirective, VakIconComponent } from 'harmony';
import { IconHogerNiveau, IconUitklappenLinks, IconUitklappenRechts, IconWaarschuwing, provideIcons } from 'harmony-icons';
import { WeergaveService } from 'leerling-account-modal';
import { RouterService } from 'leerling-base';
import { ResizeObserverService } from 'leerling-util';
import { RechtenService, SGeldendVoortgangsdossierResultaat, SPlaatsing, SVakkeuze, SVakResultaten } from 'leerling/store';
import { orderBy } from 'lodash-es';
import { derivedAsync } from 'ngxtension/derived-async';
import { FindVakPeriodePipe } from '../../pipes/find-vak-periode.pipe';
import { OverzichtGemiddeldeAriaLabelPipe } from '../../pipes/overzicht-gemiddelde-aria-label.pipe';
import { OverzichtResultaatAriaLabelPipe } from '../../pipes/overzicht-resultaat-aria-label.pipe';
import { OverzichtResultaatTooltipPipe } from '../../pipes/overzicht-resultaat-tooltip.pipe';
import { CijferoverzichtService } from '../../services/cijferoverzicht/cijferoverzicht.service';

@Component({
    selector: 'sl-cijfer-overzicht-voortgang',
    imports: [
        CommonModule,
        FindVakPeriodePipe,
        VakIconComponent,
        IconDirective,
        IconPillComponent,
        TooltipDirective,
        OverzichtResultaatTooltipPipe,
        OverzichtResultaatAriaLabelPipe,
        OverzichtGemiddeldeAriaLabelPipe,
        SpinnerComponent
    ],
    templateUrl: './cijfer-overzicht-voortgang.component.html',
    styleUrls: ['./cijfer-overzicht-voortgang.component.scss'],
    providers: [provideIcons(IconUitklappenLinks, IconUitklappenRechts, IconHogerNiveau, IconWaarschuwing)],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.blur]': 'showBlur()',
        '[style.--onvoldoende-cijfer-color]': 'onvoldoendeCss()'
    }
})
export class CijferOverzichtVoortgangComponent implements AfterViewInit, OnDestroy {
    private _elementRef = inject(ElementRef);
    private _cijferoverzichtService = inject(CijferoverzichtService);
    private _rechtenService = inject(RechtenService);
    private _weergaveService = inject(WeergaveService);
    private _routerService = inject(RouterService);
    private _resizeService = inject(ResizeObserverService);

    public plaatsing = input.required<SPlaatsing>();

    private toonOnvoldoendesRood = toSignal(this._weergaveService.getToonOnvoldoendeRood$());
    public onvoldoendeCss = computed(() => (this.toonOnvoldoendesRood() ? 'var(--action-negative-normal)' : 'var(--fg-primary-normal)'));

    public overzicht = derivedAsync(() => this._cijferoverzichtService.getVoortgangCijferoverzicht(this.plaatsing().UUID));
    public vakResultaten = computed(
        () => orderBy(this.overzicht()?.vakResultaten, [(item) => item.vakkeuze.vak.naam.toLocaleLowerCase()]) ?? []
    );

    public rechten = toSignal(this._rechtenService.getCurrentAccountRechten());
    public metRapportcijfer = computed(() => this.rechten()?.rapportCijferTonenResultaatAan === true);
    public metRapportgemiddelde = computed(() => this.rechten()?.rapportGemiddeldeTonenResultaatAan === true);
    public metPeriodegemiddelde = computed(() => this.rechten()?.periodeGemiddeldeTonenResultaatAan === true);
    public geenGemiddelden = computed(() => !this.metRapportcijfer() && !this.metRapportgemiddelde() && !this.metPeriodegemiddelde());
    public aantalGemiddelden = computed(() => {
        const aantal = [this.metRapportcijfer(), this.metRapportgemiddelde(), this.metPeriodegemiddelde()].filter(Boolean).length;
        return Math.max(1, aantal);
    });
    public periodeCijferType = computed(() => {
        if (this.metRapportcijfer()) return 'Rapportcijfer';
        if (this.metRapportgemiddelde()) return 'Rapport gem.';
        if (this.metPeriodegemiddelde()) return 'Periode gem.';
        return undefined;
    });
    public periodeCijferAriaLabel = computed(() => {
        if (this.metRapportcijfer()) return 'Rapportcijfer';
        if (this.metRapportgemiddelde()) return 'Rapportgemiddelde.';
        if (this.metPeriodegemiddelde()) return 'Periodegemiddelde';
        return undefined;
    });
    public periodeState = computed(() => this.bepaalPeriodeState());
    public periodeNamen = computed(() => this.bepaalPeriodenamen());
    public periodeData = computed(() => this.bepaalPeriodeData());

    public showBlur = signal(false);

    ngAfterViewInit(): void {
        this._resizeService.observe(this._elementRef.nativeElement, () => this.updateBlur());
        this._elementRef.nativeElement.addEventListener('scroll', () => this.updateBlur());
    }

    private bepaalPeriodeState() {
        const map = new Map<number, boolean>();
        const perioden =
            this.overzicht()?.cijferperioden?.filter(
                ({ begin, eind }) => begin && eind && isWithinInterval(new Date(), { start: begin, end: eind })
            ) ?? [];

        if (perioden.length) {
            perioden.forEach(({ periode }) => map.set(periode, true));
        } else {
            const periode = this.periodeData()
                .slice()
                .reverse()
                .find((p) => p.aantalToetsen > 0);
            if (periode) map.set(periode.nummer, true);
        }

        return {
            open: signal(map)
        };
    }

    private bepaalPeriodeData() {
        const map = new Map<number, number>();
        this.overzicht()?.vakResultaten.forEach((vakResultaat) => {
            vakResultaat.perioden.forEach((periode) => {
                if (map.has(periode.periode)) {
                    map.set(periode.periode, Math.max(map.get(periode.periode) ?? 0, periode.resultaten?.length ?? 0));
                } else {
                    map.set(periode.periode, periode.resultaten.length ?? 0);
                }
            });
        });

        this.overzicht()?.cijferperioden.forEach((periode) => {
            if (!map.has(periode.periode)) map.set(periode.periode, 0);
        });

        const result: { nummer: number; aantalToetsen: number }[] = [];
        map.forEach((aantalToetsen, nummer) => {
            result.push({ nummer, aantalToetsen });
        });
        result.sort((a, b) => a.nummer - b.nummer);
        return result;
    }

    private bepaalPeriodenamen() {
        const map = new Map<number, string | undefined>();
        this.overzicht()?.cijferperioden?.forEach((periode) => {
            map.set(periode.periode, periode.afkorting);
        });
        return map;
    }

    public togglePeriode(periode: number) {
        const updatedMap = new Map<number, boolean>(this.periodeState().open());
        if (updatedMap.has(periode)) {
            updatedMap.set(periode, !updatedMap.get(periode));
        } else {
            updatedMap.set(periode, true);
        }
        this.periodeState().open.set(updatedMap);
    }

    public openVakDetail(vakkeuze: SVakkeuze, isStandaardNormering: boolean) {
        this._routerService.routeToCijfersVakresultaten(
            vakkeuze.vak.uuid,
            vakkeuze.lichtingUuid,
            undefined,
            isStandaardNormering ? undefined : 'Alternatief'
        );
    }

    public asVakresulaten(input: any): SVakResultaten {
        return input as SVakResultaten;
    }

    public asResultaat(input: any): SGeldendVoortgangsdossierResultaat | undefined {
        return input ? (input as SGeldendVoortgangsdossierResultaat) : undefined;
    }

    private updateBlur() {
        const element = this._elementRef.nativeElement;
        this.showBlur.set(element.clientWidth + element.scrollLeft < element.scrollWidth);
    }

    public ngOnDestroy(): void {
        const element = this._elementRef.nativeElement;
        this._resizeService.unobserve(element);
        element.removeEventListener('scroll', this.updateBlur());
    }
}
