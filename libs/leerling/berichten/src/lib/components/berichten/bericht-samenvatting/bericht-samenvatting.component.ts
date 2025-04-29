import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Output,
    TemplateRef,
    ViewContainerRef,
    computed,
    inject,
    input,
    signal,
    viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { animate, createTimeline } from 'animejs';
import { isToday } from 'date-fns';
import { DeviceService, IconDirective, PopupService, VerwijderConfirmationComponent, createPopupSettings, isPresent } from 'harmony';
import {
    IconBijlage,
    IconCheck,
    IconMarkerenGelezen,
    IconMarkerenOngelezen,
    IconOpties,
    IconReply,
    IconSluiten,
    IconVerwijderen,
    provideIcons
} from 'harmony-icons';
import { sortLocale } from 'leerling-util';
import { SConversatie, formatNL, getPreviewInhoudBoodschap } from 'leerling/store';
import { orderBy } from 'lodash-es';
import { NgxInjectDrag, injectDrag } from 'ngxtension/gestures';
import { P, match } from 'ts-pattern';
import { BerichtService } from '../../../services/bericht.service';
import { meestRecentOntvangenBericht, meestRecentVerstuurdeBericht } from '../../../services/conversatie.service';
import { BerichtenTabLink } from '../berichten.component';

type MobileSwipeState = 'confirmMarkeren' | 'default' | 'confirmVerwijderen';

@Component({
    selector: 'sl-bericht-samenvatting',
    imports: [CommonModule, IconDirective, VerwijderConfirmationComponent],
    templateUrl: './bericht-samenvatting.component.html',
    styleUrl: './bericht-samenvatting.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.heeft-ongelezen]': 'bevatOngelezenBoodschap()',
        '[class.selected]': 'selected()'
    },
    providers: [
        provideIcons(
            IconReply,
            IconBijlage,
            IconOpties,
            IconMarkerenOngelezen,
            IconVerwijderen,
            IconCheck,
            IconSluiten,
            IconMarkerenGelezen
        )
    ]
})
export class BerichtSamenvattingComponent {
    private readonly swipeThreshold = 120;
    private readonly berichtService = inject(BerichtService);
    popupService = inject(PopupService);
    router = inject(Router);
    deviceService = inject(DeviceService);

    meerOptiesIcon = viewChild.required('meerOptiesIcon', { read: ViewContainerRef });
    meerOptiesTemplate = viewChild.required('meerOpties', { read: TemplateRef });
    markeerIcon = viewChild.required('markeerIcon', { read: ElementRef });
    verwijderIcon = viewChild.required('verwijderIcon', { read: ElementRef });

    conversatie = input.required<SConversatie>();
    selected = input.required<boolean>();

    @Output() markeerGelezen = new EventEmitter<void>();
    @Output() markeerOngelezen = new EventEmitter<void>();
    @Output() verwijder = new EventEmitter<void>();

    showVerwijderConfirmButtons = signal(false);
    swipeState = signal<MobileSwipeState>('default');
    confirmAnimationRunning = signal(false);

    isGelezen = computed(() => !isPresent(this.conversatie().datumOudsteOngelezenBoodschap));

    elementRef = inject(ElementRef);

    constructor() {
        injectDrag(
            (state) => {
                if (this.deviceService.isDesktop() || this.confirmAnimationRunning()) return;
                this.onDragInDefaultState(state);
            },
            {
                config: () => ({
                    axis: 'x',
                    filterTaps: true,
                    from: () => [0, 0]
                })
            }
        );
    }

    bevatOngelezenBoodschap = computed(() => isPresent(this.conversatie().datumOudsteOngelezenBoodschap));
    tab = input.required<BerichtenTabLink>();
    heeftReactie = computed(() => {
        const conversatie = this.conversatie();
        const eersteBerichtIsEigen = conversatie.boodschappen[conversatie.boodschappen.length - 1].verzondenDoorGebruiker;
        const relevanteBoodschappen = eersteBerichtIsEigen ? conversatie.boodschappen.slice(0, -1) : conversatie.boodschappen;

        return this.tab() === 'postvak-in' && relevanteBoodschappen.some((boodschap) => boodschap.verzondenDoorGebruiker);
    });

    meestRecentRelevanteBericht = computed(() =>
        match(this.tab())
            .with('postvak-in', () => meestRecentOntvangenBericht(this.conversatie()))
            .with('verzonden-items', () => meestRecentVerstuurdeBericht(this.conversatie()))
            .exhaustive()
    );

    preview = computed(() => getPreviewInhoudBoodschap(this.meestRecentRelevanteBericht().inhoud));
    heeftBijlage = computed(() => this.meestRecentRelevanteBericht().bijlages.length > 0);

    datumTijd = computed(() => {
        const verzendDatum = this.meestRecentRelevanteBericht().verzendDatum;
        return isToday(verzendDatum) ? formatNL(verzendDatum, 'HH:mm') : formatNL(verzendDatum, 'dd-MM-yyyy');
    });

    afzenders = computed(() => {
        const orderedAfzenders = orderBy(
            this.conversatie()
                .boodschappen.filter((boodschap) => !boodschap.verzondenDoorGebruiker)
                .map((boodschap) => boodschap.verzenderCorrespondent)
                .filter(isPresent),
            [(correspondent) => correspondent.sorteerNaam, (correspondent) => correspondent.naam]
        );
        return [...new Set(orderedAfzenders.map((correspondent) => correspondent.naam))].join(', ');
    });

    ontvangers = computed(() =>
        sortLocale([...this.meestRecentRelevanteBericht().ontvangerCorrespondenten], ['sorteerNaam'])
            .map((c) => c.naam)
            .join(', ')
    );

    meerOptiesClick(event: Event) {
        event.stopPropagation();
        this.popupService.popup({
            template: this.meerOptiesTemplate(),
            element: this.meerOptiesIcon(),
            settings: createPopupSettings({ width: '246px', onClose: () => this.showVerwijderConfirmButtons.set(false) })
        });
    }

    markeerAlsGelezen() {
        this.popupService.close(this.meerOptiesIcon());
        this.markeerGelezen.emit();
    }

    markeerAlsOngelezen() {
        this.popupService.close(this.meerOptiesIcon());
        this.markeerOngelezen.emit();
    }

    verwijderen() {
        this.popupService.close(this.meerOptiesIcon());
        // stuur het verwijder event pas nadat de popup gesloten is, omdat de templateRef die open staat in dit component staat.
        // Wanneer het component (en dus de template) verwijderd wordt, kan de popup niet meer goed sluiten.
        setTimeout(() => {
            this.showVerwijderConfirmButtons.set(false);
            this.verwijder.emit();
        });
    }

    verwijderenMetPopup() {
        const modal = this.berichtService.createVerwijderDialog();

        let alreadyPositive = false;
        modal?.confirmResult.subscribe((confirmResult) => {
            if (confirmResult === 'Positive') {
                alreadyPositive = true;
                this.confirmVerwijderSwipe();
            }
            if ((confirmResult === 'Negative' || confirmResult === 'Closed') && !alreadyPositive) {
                this.resetElement();
            }
        });
    }

    private onDragInDefaultState(state: NgxInjectDrag['state']) {
        match(state)
            .with({ last: false }, ({ offset: [x] }) => {
                this.swipeState.set(
                    x < -this.swipeThreshold && x < 0 ? 'confirmVerwijderen' : x > this.swipeThreshold ? 'confirmMarkeren' : 'default'
                );
                this.dragElement(
                    Math.max(Math.min(x, this.elementRef.nativeElement.offsetWidth), -this.elementRef.nativeElement.offsetWidth)
                );
            })
            .with({ offset: P.when(([x]) => x > this.swipeThreshold) }, () => this.confirmMarkeerSwipe())
            .with({ offset: P.when(([x]) => x < -this.swipeThreshold) }, () => this.verwijderenMetPopup())
            .otherwise(() => this.resetElement());
    }

    confirmVerwijderSwipe(event?: Event) {
        event?.stopPropagation();
        this.confirmAnimationRunning.set(true);
        //los bovenaan gedefinieerd om daadwerkelijke call niet verborgen in animatie code te hebben
        const onComplete = () => {
            this.verwijderen();
            this.swipeState.set('default');
        };

        createTimeline({
            defaults: { ease: 'linear', duration: 200 }
        })
            .add(this.elementRef.nativeElement, {
                translateX: -this.elementRef.nativeElement.offsetWidth - 16
            })
            .add(
                this.verwijderIcon().nativeElement,
                {
                    left: this.elementRef.nativeElement.offsetWidth / 2 - 10
                },
                0
            )
            .add(this.verwijderIcon().nativeElement, {
                scale: [{ to: 1.5 }, { to: 1 }],
                duration: 400
            })
            .add(this.elementRef.nativeElement, {
                translateX: -this.elementRef.nativeElement.offsetWidth * 2,
                onComplete
            })
            .add(
                this.verwijderIcon().nativeElement,
                {
                    delay: 400,
                    left: 20,
                    duration: 0,
                    onComplete: () => this.confirmAnimationRunning.set(false)
                },
                animationStartOffset(200)
            );
    }

    confirmMarkeerSwipe(event?: Event) {
        event?.stopPropagation();
        this.confirmAnimationRunning.set(true);
        const onComplete = () => {
            if (isPresent(this.conversatie().datumOudsteOngelezenBoodschap)) this.markeerAlsGelezen();
            else this.markeerAlsOngelezen();
            this.swipeState.set('default');
        };

        createTimeline({
            defaults: { ease: 'linear', duration: 200 }
        })
            .add(this.elementRef.nativeElement, {
                translateX: this.elementRef.nativeElement.offsetWidth + 16
            })
            .add(
                this.markeerIcon().nativeElement,
                {
                    right: this.elementRef.nativeElement.offsetWidth / 2 - 10
                },
                0
            )
            .add(this.markeerIcon().nativeElement, {
                scale: [{ to: 1.5 }, { to: 1 }],
                duration: 400
            })
            .add(
                this.elementRef.nativeElement,
                {
                    translateX: 0,
                    onComplete
                },
                '+=400'
            )
            .add(
                this.markeerIcon().nativeElement,
                {
                    delay: 400,
                    right: 20,
                    duration: 0,
                    onComplete: () => this.confirmAnimationRunning.set(false)
                },
                '+=200'
            );
    }

    private dragElement(translateX: number) {
        animate(this.elementRef.nativeElement, {
            translateX,
            duration: 0,
            easing: 'linear'
        });
    }

    private resetElement() {
        this.swipeState.set('default');
        animate(this.elementRef.nativeElement, {
            translateX: 0,
            duration: 200,
            easing: 'linear'
        });
    }
}

const animationStartOffset = (offset: number) => `+=${offset}`;
