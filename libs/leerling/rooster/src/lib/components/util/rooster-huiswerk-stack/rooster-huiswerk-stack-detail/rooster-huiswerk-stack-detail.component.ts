import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    output,
    QueryList,
    ViewChildren,
    ViewContainerRef
} from '@angular/core';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
    AccessibilityService,
    createModalSettings,
    createPopupSettings,
    FULL_SCREEN_MET_MARGIN,
    ModalSettings,
    SlDatePipe
} from 'leerling-util';
import { SStudiewijzerItem } from 'leerling/store';
import { RoosterHuiswerkDropdownItemsComponent } from '../rooster-huiswerk-dropdown-items/rooster-huiswerk-dropdown-items.component';

@Component({
    selector: 'sl-rooster-huiswerk-stack-detail',
    standalone: true,
    imports: [CommonModule, RoosterHuiswerkDropdownItemsComponent, CdkTrapFocus],
    templateUrl: './rooster-huiswerk-stack-detail.component.html',
    styleUrl: './rooster-huiswerk-stack-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterHuiswerkStackDetailComponent implements AfterViewInit {
    @ViewChildren(RoosterHuiswerkDropdownItemsComponent) dropdownItems: QueryList<RoosterHuiswerkDropdownItemsComponent>;

    private _accessibilityService = inject(AccessibilityService);
    public viewContainerRef = inject(ViewContainerRef);
    public elementRef = inject(ElementRef);

    private _datePipe = new SlDatePipe();
    public dagItems = input.required<SStudiewijzerItem[]>();
    public weekItems = input.required<SStudiewijzerItem[]>();
    public datum = input<Date | undefined>(undefined);
    public baseTabIndex = input(0);
    itemSelected = output<SStudiewijzerItem>();
    public weekDatumRange = computed(() => this._datePipe.transform(this.datum(), 'week_begin_dag_tm_eind_dag_maand_kort'));

    public titel = computed(() => {
        const datum = this.datum();
        return datum ? format(datum, 'EEEE d MMMM', { locale: nl }).replace(/^\w/, (c) => c.toUpperCase()) : undefined;
    });

    ngAfterViewInit(): void {
        if (this._accessibilityService.isAccessedByKeyboard()) {
            const firstDropdownItem = this.dropdownItems.first;
            setTimeout(() => {
                firstDropdownItem.studiewijzerItems.first.elementRef.nativeElement.focus();
            });
        }
    }

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getPopupSettings(width: number) {
        return createPopupSettings({
            width: `${Math.max(width, 256)}px`,
            maxHeight: '380px',
            animation: 'slide',
            alignment: 'start'
        });
    }
}
