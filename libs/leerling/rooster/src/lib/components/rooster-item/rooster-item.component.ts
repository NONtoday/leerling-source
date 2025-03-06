import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostBinding,
    HostListener,
    OnChanges,
    OnDestroy,
    OnInit,
    Renderer2,
    Signal,
    ViewChild,
    computed,
    inject,
    input,
    signal
} from '@angular/core';
import { format } from 'date-fns';
import { DeviceService, IconPillComponent, PillComponent, PillTagColor, PillTagType } from 'harmony';
import { IconHuiswerk, IconToets, IconToetsGroot, IconYesRadio, provideIcons } from 'harmony-icons';
import { StudiemateriaalComponent, StudiemateriaalVakselectieComponent } from 'leerling-studiemateriaal';
import {
    AccessibilityService,
    ModalService,
    OverlayService,
    ResizeObserverService,
    SidebarService,
    SlDatePipe,
    ToHuiswerkTypenPipe,
    WerkdrukIndicatorComponent
} from 'leerling-util';
import { SStudiewijzerItem } from 'leerling/store';
import { StudiewijzerItemDetailComponent } from 'leerling/studiewijzer';
import { isEqual } from 'lodash-es';
import { RoosterItem } from '../../services/rooster-model';
import { RoosterService } from '../../services/rooster.service';
import { RoosterItemDetailComponent } from '../rooster-item-detail/rooster-item-detail.component';
import { RoosterKwtInschrijvenComponent } from '../rooster-kwt-inschrijven/rooster-kwt-inschrijven.component';

export const MEDIUM_WIDTH = 100;
export const LARGE_WIDTH = 120;
export const LONG_HEIGHT = 52;
const GRID_GAP = 4;

const MAX_HEIGHT = 'max-height';
const LINE_CLAMP = '-webkit-line-clamp';

const PILL_TAGTYPE_HOVER_OPEN = 'outline';
const PILL_TAGTYPE_GEKOZEN_DISABLED = 'darker';
const PILL_TAGTYPE_OPEN = 'light';

const PILL_TAGCOLOR_DISABLED = 'neutral';
const PILL_TAGCOLOR_OPEN_GEKOZEN = 'alternative';
const PILL_TAGCOLOR_LES = 'primary';
const PILL_TAGCOLOR_TOETS = 'warning';
const PILL_TAGCOLOR_GROTE_TOETS = 'negative';
const PILL_TAGCOLOR_AFSPRAAK = 'positive';
@Component({
    selector: 'sl-rooster-item',
    imports: [CommonModule, PillComponent, WerkdrukIndicatorComponent, ToHuiswerkTypenPipe, IconPillComponent],
    templateUrl: './rooster-item.component.html',
    styleUrls: ['./rooster-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconToets, IconHuiswerk, IconToetsGroot, IconYesRadio)]
})
export class RoosterItemComponent implements OnInit, OnChanges, OnDestroy {
    public roosterItem = input.required<RoosterItem>();

    @HostBinding('class.les') get isLes() {
        return this.roosterItem().isLes;
    }

    @HostBinding('class.kwt') get isKWT() {
        return this.roosterItem().isKWT;
    }

    @HostBinding('class.ingeschreven') get isIngeschreven() {
        return this.roosterItem().kwtInfo?.status === 'Ingeschreven';
    }

    @HostBinding('class.disabled') get isDisabled() {
        return this.roosterItem().kwtInfo?.status === 'Disabled';
    }

    @HostBinding('attr.aria-label') get ariaLabel() {
        return this.initAriaLabel();
    }

    @ViewChild('title', { read: ElementRef, static: true }) public titelRef: ElementRef;
    @ViewChild('subtitel', { read: ElementRef, static: false }) public subtitleRef: ElementRef;

    private _elementRef = inject(ElementRef);
    private _renderer = inject(Renderer2);
    private _resizeObserverService = inject(ResizeObserverService);
    private _overlayService = inject(OverlayService);
    private _sidebarService = inject(SidebarService);
    private _modalService = inject(ModalService);
    private _accessibilityService = inject(AccessibilityService);
    private _deviceService = inject(DeviceService);

    private _datePipe = new SlDatePipe();

    public titel = signal('');
    public isHovered = signal(false);
    private isStudiemateriaalOpen = signal(false);
    private isHuiswerkOpen = signal(false);
    public isVerlopen = computed(() => this.roosterItem().afspraakItem.kwtInfo?.inschrijfStatus === 'VERLOPEN');
    public pillText = computed(() => {
        const info = this.roosterItem().isToets ? 'Toets' : this.roosterItem().lestijd;
        const tijd = this._datePipe.transform(this.roosterItem().beginDatumTijd, 'tijd_zonder_voorloop');

        if (isEqual(info, tijd)) {
            return tijd;
        }
        return `<span class="opacity-80">${info}</span> <span>${tijd}</span>`;
    });
    public kwtPillText = computed(() => {
        if (this.isIngeschreven) {
            return this.roosterItem().lestijd;
        }
        const vol = this.roosterItem()
            .afspraakItem.kwtInfo?.afspraakActies.filter((actie) => !actie.ingeschreven)
            .every((actie) => actie.beschikbarePlaatsen === 0);
        return vol ? 'Vol' : 'Keuze';
    });

    private _isGroteToets = computed(() => {
        return this.roosterItem().studiewijzerItems.some((item) => item.huiswerkType === 'GROTE_TOETS');
    });

    public pillColor: Signal<PillTagColor> = computed(() => {
        if (this.isKWT) {
            return this.isDisabled ? PILL_TAGCOLOR_DISABLED : PILL_TAGCOLOR_OPEN_GEKOZEN;
        } else if (this._isGroteToets()) {
            return PILL_TAGCOLOR_GROTE_TOETS;
        } else if (this.roosterItem().isToets) {
            return PILL_TAGCOLOR_TOETS;
        } else if (this.isLes) {
            return PILL_TAGCOLOR_LES;
        }
        return PILL_TAGCOLOR_AFSPRAAK;
    });

    public pillType: Signal<PillTagType> = computed(() => {
        const open = this.roosterItem().kwtInfo?.status === 'Open';

        if (open) {
            return this.isHovered() ? PILL_TAGTYPE_HOVER_OPEN : PILL_TAGTYPE_OPEN;
        }
        return PILL_TAGTYPE_GEKOZEN_DISABLED;
    });

    private initAriaLabel() {
        const { kwtInfo, afspraakItem, isToets } = this.roosterItem();
        const huiswerkTypen = new ToHuiswerkTypenPipe().transform(this.roosterItem().studiewijzerItems);
        const titel = this.isKWT ? kwtInfo?.keuzeTitel : this.roosterItem().omschrijving;
        const labelVelden = [
            titel,
            RoosterService.formatBeginEindLesuurForAriaLabel(afspraakItem),
            format(afspraakItem.beginDatumTijd, 'H:mm')
        ];

        if (kwtInfo?.ondertitel) labelVelden.push(kwtInfo.ondertitel);
        if (afspraakItem.locatie) labelVelden.push('Locatie: ' + afspraakItem.locatie);
        if (huiswerkTypen.heeftGroteToets) labelVelden.push('Heeft grote toets');
        if (isToets) labelVelden.push('Heeft toets');
        if (huiswerkTypen.heeftInleveropdracht) labelVelden.push('Heeft inleveropdracht');
        if (huiswerkTypen.heeftHuiswerk) labelVelden.push('Heeft huiswerk');

        return labelVelden.filter((veld) => !!veld).join(', ');
    }

    ngOnInit(): void {
        this._resizeObserverService.observe(this._elementRef.nativeElement, () => {
            const size = this._elementRef.nativeElement.getBoundingClientRect();
            const widthAttr = size.width < MEDIUM_WIDTH ? 'small' : size.width < LARGE_WIDTH ? 'medium' : 'large';
            this._renderer.setAttribute(this._elementRef.nativeElement, 'width', widthAttr);
            this._renderer.setAttribute(this._elementRef.nativeElement, 'height', size.height >= LONG_HEIGHT ? 'long' : 'short');
            this.updateTitel();
            this.ellipseTitelEnSubtitel();
        });
    }

    ngOnChanges(): void {
        if (this._elementRef) {
            this.updateTitel();
            this.ellipseTitelEnSubtitel();
        }
    }

    ngOnDestroy(): void {
        this._resizeObserverService.unobserve(this._elementRef.nativeElement);
    }

    private updateTitel() {
        const width = this._elementRef.nativeElement.getBoundingClientRect().width;
        const omschrijving = this.roosterItem().omschrijving;
        const afkorting = this.roosterItem().afkorting ?? omschrijving;
        const keuzetitel = this.roosterItem().kwtInfo?.keuzeTitel ?? '';
        if (this.isKWT) {
            this.titel.set(keuzetitel);
        } else {
            this.titel.set(width < LARGE_WIDTH ? afkorting : omschrijving);
        }
    }

    private ellipseTitelEnSubtitel() {
        const elementStyle = getComputedStyle(this._elementRef.nativeElement);
        const elementHeight = parseInt(elementStyle.height, 10);

        if (elementHeight < LONG_HEIGHT || isNaN(elementHeight)) return;

        this.resetMaxHeightAndLineClamp();

        const titelStyle = this.getHeightAndLineHeight(this.titelRef);
        const subtitelStyle = this.getHeightAndLineHeight(this.subtitleRef);

        // Hoogte van element min de verticale padding en min de gap tussen rijen
        const useableHeight =
            parseInt(elementStyle.height, 10) - parseInt(elementStyle.paddingTop, 10) - parseInt(elementStyle.paddingBottom, 10) - GRID_GAP;
        const aantalRegels = Math.floor(useableHeight / titelStyle.lineHeight);
        const aantalRegelsTitel = Math.ceil(titelStyle.height / titelStyle.lineHeight);
        const aantalRegelsLocatie = Math.ceil(subtitelStyle.height / subtitelStyle.lineHeight);

        if (!this.subtitleRef) {
            this.setMaxHeightAndLineClamp(this.titelRef, aantalRegels, titelStyle.lineHeight);
            return;
        }

        if (titelStyle.height + subtitelStyle.height < useableHeight) {
            // Doe niks, is al afgehandeld door: resetMaxHeightAndLineClamp
        } else if (aantalRegelsTitel === 1) {
            // Titel past op één regel, geef locatie de rest
            this.setMaxHeightAndLineClamp(this.subtitleRef, aantalRegels - 1, subtitelStyle.lineHeight);
        } else if (aantalRegelsLocatie === 1) {
            // Locatie past op één regel, geef titel de rest
            this.setMaxHeightAndLineClamp(this.titelRef, aantalRegels - 1, subtitelStyle.lineHeight);
        } else if (aantalRegels === 2) {
            // Twee regels beschikbaar, dus titel en locatie elk één regel
            this.setMaxHeightAndLineClamp(this.titelRef, 1, subtitelStyle.lineHeight);
            this.setMaxHeightAndLineClamp(this.subtitleRef, 1, titelStyle.lineHeight);
        } else if (aantalRegels <= 4) {
            // Titel is meer dan één regel dus, geef titel twee regels en locatie de rest bij drie of vier regels
            this.setMaxHeightAndLineClamp(this.titelRef, 2, subtitelStyle.lineHeight);
            this.setMaxHeightAndLineClamp(this.subtitleRef, aantalRegels - 2, titelStyle.lineHeight);
        } else if (aantalRegels - aantalRegelsTitel >= 2) {
            // Titel past volledig met minimaal twee regels over voor locatie, geef locatie de overige regels
            this.setMaxHeightAndLineClamp(this.subtitleRef, aantalRegels - aantalRegelsTitel, subtitelStyle.lineHeight);
        } else {
            // Titel en locatie meer dan twee regels en passen beide niet, locatie twee regels en de titel de rest
            this.setMaxHeightAndLineClamp(this.titelRef, aantalRegels - 2, titelStyle.lineHeight);
            this.setMaxHeightAndLineClamp(this.subtitleRef, 2, subtitelStyle.lineHeight);
        }
    }

    private resetMaxHeightAndLineClamp() {
        [this.titelRef, this.subtitleRef].filter(Boolean).forEach((element) => {
            this._renderer.removeStyle(element.nativeElement, MAX_HEIGHT);
            this._renderer.removeStyle(element.nativeElement, LINE_CLAMP);
        });
    }

    private getHeightAndLineHeight(elementRef: ElementRef): { height: number; lineHeight: number } {
        if (!elementRef) return { height: 0, lineHeight: 0 };

        const style = getComputedStyle(elementRef.nativeElement);
        return {
            height: parseFloat(style.height),
            lineHeight: parseFloat(style.lineHeight)
        };
    }

    private setMaxHeightAndLineClamp(element: ElementRef, aantalRegels: number, lineHeight: number) {
        this._renderer.setStyle(element.nativeElement, MAX_HEIGHT, `${aantalRegels * lineHeight}px`);
        this._renderer.setStyle(element.nativeElement, LINE_CLAMP, aantalRegels);
    }

    @HostListener('focus')
    onFocus(): void {
        // Indien we met toetsenbordnavigatie werken scrollen we het gefocussde element in het zicht.
        if (!this._accessibilityService.isAccessedByKeyboard()) return;
        window.scroll(0, this._elementRef.nativeElement.offsetTop - 20);
    }

    @HostListener('mouseenter')
    onMouseEnter(): void {
        this.isHovered.set(true);
    }

    @HostListener('mouseleave')
    onMouseLeave(): void {
        this.isHovered.set(false);
    }

    @HostListener('click', ['$event'])
    public onClick(event: Event) {
        event.stopPropagation();

        if (this.roosterItem().kwtInfo?.status === 'Disabled') return;
        if (this.roosterItem().kwtInfo?.status === 'Open') {
            return this.openKWTInschrijven();
        }
        return this.openRoosterItemDetail();
    }

    private openRoosterItemDetail() {
        const component = this._overlayService.sidebarOrModal(
            RoosterItemDetailComponent,
            computed(() => ({
                roosterItem: this.roosterItem(),
                pillColor: this.pillColor()
            })),
            {
                ...RoosterItemDetailComponent.getSidebarSettings(this.roosterItem().omschrijving),
                onClose: () => this._onRoosterDetailsClose()
            },
            {
                ...RoosterItemDetailComponent.getModalSettings(),
                onClose: () => this._onRoosterDetailsClose(),
                heightRollup:
                    this.roosterItem().isKWT && this.roosterItem().afspraakItem.kwtInfo?.inschrijfStatus != 'DEFINITIEF'
                        ? '540px'
                        : 'initial'
            }
        );
        component.huiswerkItemSelected.subscribe((item) => this.openHuiswerk(item));
        component.openStudiemateriaal.subscribe(() => this.openStudiemateriaal());
        component.openEditKwtItem.subscribe(() => this.openKWTInschrijven());
    }

    private reopenModal() {
        this.isStudiemateriaalOpen.set(false);
        this.isHuiswerkOpen.set(false);
        if (!this._modalService.isOpen() && this._deviceService.isPhoneOrTabletPortrait()) {
            this.openRoosterItemDetail();
        }
    }

    private openHuiswerk(huiswerk: SStudiewijzerItem) {
        if (this.isHuiswerkOpen()) return;
        this.isHuiswerkOpen.set(true);
        this._modalService.close();
        this._sidebarService.push(
            StudiewijzerItemDetailComponent,
            computed(() => ({
                item: this.roosterItem().studiewijzerItems.find((swi) => swi.id === huiswerk.id) ?? huiswerk,
                showBackButton: false
            })),
            StudiewijzerItemDetailComponent.getSidebarSettings(huiswerk, this._sidebarService, false, () => this.reopenModal())
        );
    }

    private openStudiemateriaal() {
        if (this.isStudiemateriaalOpen()) return;
        this.isStudiemateriaalOpen.set(true);
        this._modalService.close();
        const vak = this.roosterItem().afspraakItem.vak;
        if (vak) {
            this._sidebarService.push(
                StudiemateriaalComponent,
                {
                    vak: vak,
                    lesgroep: undefined,
                    toonAlgemeneLeermiddelen: true
                },
                StudiemateriaalComponent.getSidebarSettings(vak, () => this.reopenModal())
            );
        } else {
            this._sidebarService.push(
                StudiemateriaalVakselectieComponent,
                {},
                StudiemateriaalVakselectieComponent.getSidebarSettings(() => this.reopenModal())
            );
        }
    }

    private openKWTInschrijven() {
        const wasOpen = this._modalService.isOpen();
        if (wasOpen) {
            this._modalService.close();
        }
        this._sidebarService.push(
            RoosterKwtInschrijvenComponent,
            computed(() => ({
                roosterItem: this.roosterItem()
            })),
            {
                ...RoosterKwtInschrijvenComponent.getSidebarSettings('Inschrijven'),
                onClose: () => {
                    this._onRoosterDetailsClose();
                    if (wasOpen) {
                        this.openRoosterItemDetail();
                    }
                }
            }
        );
    }

    private _onRoosterDetailsClose() {
        if (this._accessibilityService.isAccessedByKeyboard()) {
            this._elementRef.nativeElement.focus();
        }
    }
}
