import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostBinding,
    OnChanges,
    computed,
    inject,
    input,
    output
} from '@angular/core';
import { CheckboxComponent, IconDirective, PillComponent, StripHTMLPipe, TooltipDirective, isPresent } from 'harmony';
import {
    IconChevronRechts,
    IconHuiswerk,
    IconInleveropdracht,
    IconLesstof,
    IconToets,
    IconToetsGroot,
    IconWaarschuwing,
    provideIcons
} from 'harmony-icons';
import { AccessibilityService } from 'leerling-util';
import { SStudiewijzerItem } from 'leerling/store';
import { StudiewijzerItemIconColorPipe } from '../pipes/studiewijzer-item-icon-color.pipe';
import { StudiewijzerItemIconPipe } from '../pipes/studiewijzer-item-icon.pipe';
import { TitelType, getTitel } from './studiewijzer-item.util';

@Component({
    selector: 'sl-studiewijzer-item',
    standalone: true,
    imports: [
        CommonModule,
        IconDirective,
        StripHTMLPipe,
        CheckboxComponent,
        TooltipDirective,
        StudiewijzerItemIconPipe,
        StudiewijzerItemIconColorPipe,
        PillComponent
    ],
    templateUrl: './studiewijzer-item.component.html',
    styleUrl: './studiewijzer-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        provideIcons(IconInleveropdracht, IconHuiswerk, IconToets, IconToetsGroot, IconLesstof, IconWaarschuwing, IconChevronRechts)
    ]
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
            this.afgevinkt ? 'afgevinkt' : 'niet afgevinkt',
            this.vervangTotEnMet(this.alternatieveOmschrijving() ?? new StripHTMLPipe().transform(item.omschrijving))
        ];
        if (item.isInleveropdracht && !item.heeftInlevering) labelVelden.push('Nog geen inlevering');

        return labelVelden.filter(isPresent).join(', ');
    });

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

    private _changeDetectorRef = inject(ChangeDetectorRef);

    public titel = '';

    toonAfvinkKnopZonderScreenReader = computed(() => !this.accessibilityService.isScreenReaderMobileEnabled() && this.toonAfvinkKnop());

    ngOnChanges(): void {
        this.titel = getTitel(this.item(), this.titelType());
        this.afgevinkt = this.item().gemaakt;
    }

    onAfvinken() {
        this.afgevinkt = !this.afgevinkt;
        this._changeDetectorRef.markForCheck();
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
