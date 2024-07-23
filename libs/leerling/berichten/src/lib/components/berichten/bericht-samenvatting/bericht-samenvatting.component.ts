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
import * as anime from 'animejs/lib/anime.js';
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
import { meestRecentOntvangenBericht, meestRecentVerstuurdeBericht } from '../../../services/conversatie.service';
import { BerichtenTabLink } from '../berichten.component';

type MobileSwipeState = 'confirmMarkeren' | 'default' | 'confirmVerwijderen';

@Component({
    selector: 'sl-bericht-samenvatting',
    standalone: true,
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
        this.popupService.popup(
            this.meerOptiesTemplate(),
            this.meerOptiesIcon(),
            undefined,
            createPopupSettings({ width: '246px', onClose: () => this.showVerwijderConfirmButtons.set(false) })
        );
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
            .with({ offset: P.when(([x]) => x < -this.swipeThreshold) }, () => this.confirmVerwijderSwipe())
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

        anime
            .timeline({
                duration: 200,
                easing: 'linear'
            })
            .add({
                targets: this.elementRef.nativeElement,
                translateX: -this.elementRef.nativeElement.offsetWidth - 16
            })
            .add({
                targets: this.verwijderIcon().nativeElement,
                keyframes: [{ scale: 1.5 }, { scale: 1 }],
                duration: 400
            })
            .add({
                targets: this.elementRef.nativeElement,
                translateX: -this.elementRef.nativeElement.offsetWidth * 2,
                complete: onComplete
            })
            .add(
                {
                    targets: this.verwijderIcon().nativeElement,
                    delay: 400,
                    left: 20,
                    duration: 0,
                    complete: () => this.confirmAnimationRunning.set(false)
                },
                animationStartOffset(200)
            );
        this.animateVerwijderIconToCenter();
    }

    confirmMarkeerSwipe(event?: Event) {
        event?.stopPropagation();
        this.confirmAnimationRunning.set(true);
        const onComplete = () => {
            isPresent(this.conversatie().datumOudsteOngelezenBoodschap) ? this.markeerAlsGelezen() : this.markeerAlsOngelezen();
            this.swipeState.set('default');
        };
        anime
            .timeline({
                duration: 200,
                easing: 'linear'
            })
            .add({
                targets: this.elementRef.nativeElement,
                translateX: this.elementRef.nativeElement.offsetWidth + 16
            })
            .add({
                targets: this.markeerIcon().nativeElement,
                keyframes: [{ scale: 1.5 }, { scale: 1 }],
                duration: 400
            })
            .add(
                {
                    targets: this.elementRef.nativeElement,
                    translateX: 0,
                    complete: onComplete
                },
                animationStartOffset(400)
            )
            .add(
                {
                    targets: this.markeerIcon().nativeElement,
                    delay: 400,
                    right: 20,
                    duration: 0,
                    complete: () => this.confirmAnimationRunning.set(false)
                },
                animationStartOffset(200)
            );
        this.animateMarkeerIconToCenter();
    }

    private animateMarkeerIconToCenter() {
        anime({
            targets: this.markeerIcon().nativeElement,
            right: this.elementRef.nativeElement.offsetWidth / 2 - 10,
            duration: 200,
            easing: 'linear'
        });
    }
    private animateVerwijderIconToCenter() {
        anime({
            targets: this.verwijderIcon().nativeElement,
            left: this.elementRef.nativeElement.offsetWidth / 2 - 10,
            duration: 200,
            easing: 'linear'
        });
    }

    private dragElement(translateX: number) {
        anime({
            targets: this.elementRef.nativeElement,
            translateX,
            duration: 0,
            easing: 'linear'
        });
    }

    private resetElement() {
        this.swipeState.set('default');
        anime({
            targets: this.elementRef.nativeElement,
            translateX: 0,
            duration: 200,
            easing: 'linear'
        });
    }
}

const animationStartOffset = (offset: number) => `+=${offset}`;
