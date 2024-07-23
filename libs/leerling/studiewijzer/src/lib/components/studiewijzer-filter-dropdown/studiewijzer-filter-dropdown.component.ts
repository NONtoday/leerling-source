import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    QueryList,
    ViewChildren,
    ViewContainerRef,
    computed,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonComponent, SpinnerComponent } from 'harmony';
import {
    AccessibilityService,
    FULL_SCREEN_MET_MARGIN,
    InfoMessageService,
    KeyPressedService,
    ModalSettings,
    ModalSwipableGuard,
    OverlayService,
    createModalSettings,
    createPopupSettings
} from 'leerling-util';
import { SVakkeuze } from 'leerling/store';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';
import { SelectedFilters } from '../filter/filter';
import { StudiewijzerFilterDropdownItemComponent } from '../studiewijzer-filter-dropdown-item/studiewijzer-filter-dropdown-item.component';
import { GROTETOETSFILTER, HUISWERKFILTER, HuiswerkFilterType, INLEVEROPDRACHTFILTER, TOETSFILTER } from './huiswerkfilter-typen';

@Component({
    selector: 'sl-studiewijzer-filter-dropdown',
    standalone: true,
    imports: [CommonModule, StudiewijzerFilterDropdownItemComponent, ButtonComponent, SpinnerComponent],
    templateUrl: './studiewijzer-filter-dropdown.component.html',
    styleUrl: './studiewijzer-filter-dropdown.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerFilterDropdownComponent implements OnInit, AfterViewInit, ModalSwipableGuard, OnDestroy {
    @ViewChildren(StudiewijzerFilterDropdownItemComponent) dropdownItems: QueryList<StudiewijzerFilterDropdownItemComponent>;

    vakkeuzes = input.required<SVakkeuze[] | undefined>();
    activeFilters = input<SelectedFilters>({ swiType: [], vak: [] });

    public filters = output<SelectedFilters>();

    private _scrollElement = new BehaviorSubject<ElementRef[]>([]);
    private destroy$ = new Subject<void>();

    private _infomessageService = inject(InfoMessageService);
    private _overlayService = inject(OverlayService);
    private _keyPressedService = inject(KeyPressedService);
    private _accessibilityService = inject(AccessibilityService);
    public viewContainerRef = inject(ViewContainerRef);
    public elementRef = inject(ElementRef);

    public huiswerkFilterTypen: HuiswerkFilterType[] = [HUISWERKFILTER, TOETSFILTER, GROTETOETSFILTER, INLEVEROPDRACHTFILTER];
    public numberSelected = signal(0);
    public totalCheckboxes = computed(() => (this.vakkeuzes()?.length ?? 0) + this.huiswerkFilterTypen.length);
    public allSelectedOrDeselected = computed(() =>
        this.numberSelected() === this.totalCheckboxes() ? 'Alles deselecteren' : 'Alles selecteren'
    );
    public numberActiveFiltersText = computed(
        () => `Filter wissen (${this.activeFilters().swiType.length + this.activeFilters().vak.length})`
    );

    constructor() {
        this._keyPressedService.mainKeyboardEvent$.pipe(takeUntilDestroyed()).subscribe((event) => this.handleKeyEvent(event));
    }

    ngOnInit() {
        setTimeout(() => {
            this._scrollElement.next([this.elementRef]);
        });
    }

    ngAfterViewInit(): void {
        const swiFilters = this.activeFilters().swiType;
        const vakFilters = this.activeFilters().vak;
        [...swiFilters, ...vakFilters].forEach((filterItem) =>
            this.dropdownItems.find((item) => item.filterValue() === filterItem)?.onAfvinken()
        );

        if (this._accessibilityService.isAccessedByKeyboard()) {
            setTimeout(() => {
                this.dropdownItems.first.elementRef.nativeElement.focus();
            });
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private handleKeyEvent(event: KeyboardEvent) {
        const focusedElement = document.activeElement as HTMLElement;
        if (!focusedElement) return;

        switch (event.key) {
            case ' ':
                if (event.target !== document.body) {
                    event.preventDefault();
                }
                break;
            case 'Tab':
                if (!event.shiftKey) {
                    const viewContainerRect = this.elementRef.nativeElement.getBoundingClientRect();
                    const elementRect = focusedElement.getBoundingClientRect();
                    const positionRelativeToContainer = elementRect.top - viewContainerRect.top;
                    const scrollY =
                        this.viewContainerRef.element.nativeElement.scrollTop - viewContainerRect.height / 2 + positionRelativeToContainer;
                    this.viewContainerRef.element.nativeElement.scrollTo(0, scrollY);
                }
                break;
            case 'Home':
                if (event.target !== document.body) {
                    this.dropdownItems.first.elementRef.nativeElement.focus();
                }
                break;
            case 'End':
                if (event.target !== document.body) {
                    this.dropdownItems.last.elementRef.nativeElement.focus();
                }
                break;
            case 'ArrowUp':
            case 'ArrowDown':
                {
                    const isArrowUp = event.key === 'ArrowUp';
                    const select = this.viewContainerRef.element.nativeElement.querySelector('.select');
                    const indexOfDropdownItem = this.dropdownItems
                        .toArray()
                        .findIndex((item) => item.elementRef.nativeElement === focusedElement);
                    const newIndex = isArrowUp ? indexOfDropdownItem - 1 : indexOfDropdownItem + 1;
                    const indexToFocus = Math.max(Math.min(newIndex, this.dropdownItems.toArray().length - 1), 0);
                    if (isArrowUp && focusedElement === select) return;

                    const itemToFocus = this.dropdownItems.toArray()[indexToFocus].elementRef.nativeElement;
                    itemToFocus.focus();

                    if (isArrowUp && focusedElement === itemToFocus) {
                        select.focus();
                    }
                }
                break;
        }
    }

    public setAantalGeselecteerd(amount: number) {
        this.numberSelected.set(this.numberSelected() + amount);
    }

    public selectOrDeselectAll(): void {
        if (this.allSelectedOrDeselected() === 'Alles deselecteren') return this.deselectAllCheckboxes();
        this.dropdownItems.forEach((item) => {
            if (item.afgevinkt()) return;
            item.onAfvinken();
        });
    }

    public resetAndSubmit() {
        this.deselectAllCheckboxes();
        this.onSubmit();
    }

    public deselectAllCheckboxes(): void {
        this.dropdownItems.forEach((item) => {
            item.afgevinkt.set(false);
            this.numberSelected.set(0);
        });
    }

    public onAfvinken(label: string): void {
        this.dropdownItems.find((element) => element.filterValue() === label)?.onAfvinken();
    }

    public onSubmit(): void {
        const filters = this.dropdownItems
            .filter((item) => item.afgevinkt())
            .reduce(
                (acc, item) => {
                    if (item.type() === 'vak') {
                        acc.vak.push(item.filterValue());
                    } else {
                        acc.swiType.push(item.filterValue());
                    }
                    return acc;
                },
                { swiType: [], vak: [] } as SelectedFilters
            );
        this.filters.emit(filters);
        this._infomessageService.dispatchSuccessMessage('Filter opgeslagen');
        this.close();
    }

    public close(): void {
        this._overlayService.animateAndClose(this);
    }

    getScrollableElements(): Observable<ElementRef[]> {
        return this._scrollElement.pipe(takeUntil(this.destroy$));
    }

    isSwipeAllowed(): boolean {
        return this.elementRef.nativeElement.scrollTop === 0;
    }

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getPopupSettings(width: number) {
        return createPopupSettings({
            width: `${Math.max(width)}px`,
            animation: 'slide',
            alignment: 'start'
        });
    }
}
