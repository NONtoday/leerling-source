import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconDirective, IconPillComponent, SpinnerComponent, TooltipDirective, VakIconComponent } from 'harmony';
import { IconHogerNiveau, IconUitklappenLinks, IconUitklappenRechts, IconWaarschuwing, provideIcons } from 'harmony-icons';
import { WeergaveService } from 'leerling-account-modal';
import { RouterService } from 'leerling-base';
import { ResizeObserverService } from 'leerling-util';
import { SExamendossierContext, SGeldendVoortgangsdossierResultaat, SVakkeuze, SVakResultaten } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { ExamenGemiddeldeAriaLabelPipe } from '../../pipes/examen-gemiddelde-aria-label.pipe';
import { ExamenGemiddeldeTooltipPipe } from '../../pipes/examen-gemiddelde-tooltip.pipe';
import { FindToetssoortGemiddeldePipe } from '../../pipes/find-toetssoortgemiddelde.pipe';
import { OverzichtResultaatAriaLabelPipe } from '../../pipes/overzicht-resultaat-aria-label.pipe';
import { OverzichtResultaatTooltipPipe } from '../../pipes/overzicht-resultaat-tooltip.pipe';
import { CijferoverzichtService } from '../../services/cijferoverzicht/cijferoverzicht.service';

@Component({
    selector: 'sl-cijfer-overzicht-examen',
    standalone: true,
    imports: [
        CommonModule,
        FindToetssoortGemiddeldePipe,
        VakIconComponent,
        IconDirective,
        IconPillComponent,
        TooltipDirective,
        OverzichtResultaatTooltipPipe,
        OverzichtResultaatAriaLabelPipe,
        SpinnerComponent,
        ExamenGemiddeldeAriaLabelPipe,
        ExamenGemiddeldeTooltipPipe
    ],
    templateUrl: './cijfer-overzicht-examen.component.html',
    styleUrls: ['../cijfer-overzicht-voortgang/cijfer-overzicht-voortgang.component.scss', './cijfer-overzicht-examen.component.scss'],
    providers: [provideIcons(IconUitklappenLinks, IconUitklappenRechts, IconHogerNiveau, IconWaarschuwing)],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.blur]': 'showBlur()'
    }
})
export class CijferOverzichtExamenComponent implements AfterViewInit, OnDestroy {
    private _elementRef = inject(ElementRef);
    private _cijferoverzichtService = inject(CijferoverzichtService);
    private _weergaveService = inject(WeergaveService);
    private _routerService = inject(RouterService);
    private _resizeService = inject(ResizeObserverService);

    public examendossierContext = input.required<SExamendossierContext>();

    private toonOnvoldoendesRood = toSignal(this._weergaveService.getToonOnvoldoendeRood$());

    public overzicht = derivedAsync(() =>
        this._cijferoverzichtService.getExamencijferoverzicht(
            this.examendossierContext().plaatsingUuid,
            this.examendossierContext().lichtingUuid
        )
    );

    public cijfersOpen = signal(true);
    public gemiddeldenOpen = signal(true);

    public showBlur = signal(false);

    constructor() {
        effect(() => {
            this._elementRef.nativeElement.style.setProperty(
                '--onvoldoende-cijfer-color',
                this.toonOnvoldoendesRood() ? 'var(--action-negative-normal)' : 'var(--fg-primary-normal)'
            );
        });
    }

    ngAfterViewInit(): void {
        this._resizeService.observe(this._elementRef.nativeElement, () => this.updateBlur());
        this._elementRef.nativeElement.addEventListener('scroll', () => this.updateBlur());
    }

    public openVakDetail(vakkeuze: SVakkeuze) {
        this._routerService.routeToCijfersVakresultaten(
            vakkeuze.vak.uuid,
            vakkeuze.lichtingUuid,
            this.examendossierContext().plaatsingUuid,
            'Examen',
            vakkeuze.vak.naam
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

    toggleCijfers() {
        this.cijfersOpen.set(!this.cijfersOpen());
    }

    toggleGemiddelden() {
        this.gemiddeldenOpen.set(!this.gemiddeldenOpen());
    }
}
