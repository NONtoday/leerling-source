import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostBinding,
    OnChanges,
    computed,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import { isAfter } from 'date-fns';
import { CheckboxComponent, IconDirective, PillComponent, SpinnerComponent, StripHTMLPipe, TooltipDirective, isPresent } from 'harmony';
import {
    IconChevronRechts,
    IconHuiswerk,
    IconInleveropdracht,
    IconLesstof,
    IconSlot,
    IconToets,
    IconToetsGroot,
    IconWaarschuwing,
    provideIcons
} from 'harmony-icons';
import { AccessibilityService } from 'leerling-util';
import { SStudiewijzerItem } from 'leerling/store';
import { StudiewijzerItemIconColorPipe } from '../pipes/studiewijzer-item-icon-color.pipe';
import { StudiewijzerItemIconPipe } from '../pipes/studiewijzer-item-icon.pipe';
import { TitelType, getOmschrijving, getTitel } from './studiewijzer-item.util';

@Component({
    selector: 'sl-studiewijzer-item',
    imports: [
        CommonModule,
        IconDirective,
        StripHTMLPipe,
        CheckboxComponent,
        TooltipDirective,
        StudiewijzerItemIconPipe,
        StudiewijzerItemIconColorPipe,
        PillComponent,
        SpinnerComponent
    ],
    templateUrl: './studiewijzer-item.component.html',
    styleUrl: './studiewijzer-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        provideIcons(
            IconInleveropdracht,
            IconHuiswerk,
            IconToets,
            IconToetsGroot,
            IconLesstof,
            IconWaarschuwing,
            IconChevronRechts,
            IconSlot
        )
    ],
    host: {
        '[class.disable-checkbox-animation]': 'state().saving()'
    }
})
export class StudiewijzerItemComponent implements OnChanges {
    @HostBinding('attr.role') private _role = 'button';

    public elementRef = inject(ElementRef);
    public accessibilityService = inject(AccessibilityService);
    public item = input.required<SStudiewijzerItem>();
    public toonAfvinkKnop = input<boolean>(true);
    public toonChevron = input<boolean>(false);
    public titelType = input<TitelType>('vakOfLesgroepnaam');
    public alternatieveOmschrijving = input<string | undefined>(undefined);
    public toonAankomend = input<boolean>(false);
    public benoemIcon = input<boolean>(true);
    public ariaLabel = computed(() => {
        const item = this.item();

        const labelVelden: (string | undefined)[] = [
            item.swiToekenningType === 'AFSPRAAK' ? '' : item.swiToekenningType + 'taak',
            this.getHuiswerkTypeOmschrijving(item),
            getTitel(item, this.titelType()),
            this.toonAfvinkKnop() ? (this.afgevinkt ? 'afgevinkt' : 'niet afgevinkt') : undefined,
            this.vervangTotEnMet(this.alternatieveOmschrijving() ?? new StripHTMLPipe().transform(item.omschrijving))
        ];
        if (item.isInleveropdracht && !item.laatsteInleveringStatus) labelVelden.push('Nog geen inlevering');

        return labelVelden.filter(isPresent).join(', ');
    });

    public state = computed(() => ({
        // item staat in de state zodat saving reset wordt bij update van de value
        item: this.item(),
        saving: signal(false)
    }));

    public isNaStartPeriode = computed(() => {
        const inleverStart = this.item().inlevermoment?.start;
        return inleverStart && isAfter(new Date(), inleverStart);
    });

    public toonWaarschuwing = computed(
        () =>
            this.item().isInleveropdracht &&
            this.isNaStartPeriode() &&
            (!this.item().laatsteInleveringStatus || this.item().laatsteInleveringStatus === 'HEROPEND')
    );
    public toonSlot = computed(
        () =>
            this.item().isInleveropdracht &&
            (this.item().laatsteInleveringStatus === 'IN_BEHANDELING' || this.item().laatsteInleveringStatus === 'AKKOORD')
    );

    public toggleAfgevinkt = output<SStudiewijzerItem>();

    @HostBinding('class.afgevinkt') public afgevinkt = false;
    public toonCompacteOmschrijving = input<boolean>(false);

    @HostBinding('class.compact')
    private get compactClass() {
        return this.toonCompacteOmschrijving();
    }

    private studiewijzerItemIconColorPipe = new StudiewijzerItemIconColorPipe();
    @HostBinding('style.border-left')
    private get leftIndicator() {
        return '4px solid var(--' + this.studiewijzerItemIconColorPipe.transform(this.item(), this.afgevinkt) + ')';
    }

    public titel = '';
    public omschrijving = '';

    toonAfvinkKnopZonderScreenReader = computed(() => !this.accessibilityService.isScreenReaderMobileEnabled() && this.toonAfvinkKnop());

    ngOnChanges(): void {
        this.titel = getTitel(this.item(), this.titelType());
        this.omschrijving = getOmschrijving(this.item(), this.titelType());
        this.afgevinkt = this.item().gemaakt;
    }

    onAfvinken(event: Event) {
        event.stopPropagation();
        this.state().saving.set(true);
        this.toggleAfgevinkt.emit(this.item());
    }

    private vervangTotEnMet(label: string): string {
        return label.replace('t/m', 'tot en met');
    }

    private getHuiswerkTypeOmschrijving(item: SStudiewijzerItem): string | undefined {
        if (!this.benoemIcon()) return undefined;

        if (item.isInleveropdracht) return 'Inleveropdracht';

        switch (item.huiswerkType) {
            case 'LESSTOF':
                return 'lesstof';
            case 'TOETS':
                return 'toets';
            case 'GROTE_TOETS':
                return 'Grote toets';
            default:
                return 'huiswerk';
        }
    }
}
