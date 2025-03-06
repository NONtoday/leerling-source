import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    DestroyRef,
    HostBinding,
    HostListener,
    inject,
    input,
    OnChanges,
    OnDestroy,
    OnInit,
    output,
    signal,
    ViewContainerRef,
    WritableSignal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { IconDirective } from 'harmony';
import { IconChevronOnder, provideIcons } from 'harmony-icons';
import { map } from 'rxjs';
import { AccessibilityService } from '../accessibility/accessibility.service';
import { onRefresh } from '../injection/refresh-injection';
import { createPopupSettings } from '../popup/popup-settings';
import { PopupService } from '../popup/service/popup.service';
import { RefreshReason } from '../services/refresh.service';
import { DropdownListComponent } from './dropdown-list.component';

export interface DropdownItem<T> {
    label: string;
    identifier: string;
    data: T;
}

export interface DropdownConfig<T> {
    geenItemLabel?: string;
    getDefaultItemFn?: (items: DropdownItem<T>[]) => DropdownItem<T> | undefined;
    sorteerItemsFn?: (items: DropdownItem<T>[]) => DropdownItem<T>[];
}

const DROPDOWN_ITEM_QUERY_PARAM = 'dropdownitem';

@Component({
    selector: 'sl-dropdown',
    standalone: true,
    imports: [CommonModule, IconDirective],
    templateUrl: './dropdown.component.html',
    styleUrls: ['./dropdown.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronOnder)]
})
export class DropdownComponent<T> implements OnChanges, OnDestroy, OnInit {
    private _router = inject(Router);
    private _activatedRoute = inject(ActivatedRoute);
    private _changeDetector = inject(ChangeDetectorRef);
    private _viewContainerRef = inject(ViewContainerRef);
    private _popupService = inject(PopupService);
    private _accessibilityService = inject(AccessibilityService);
    private _destroyRef = inject(DestroyRef);

    items = input.required<DropdownItem<T>[]>();
    config = input<DropdownConfig<T>>();

    itemGewisseld = output<DropdownItem<T> | undefined>();

    geselecteerdeItem: WritableSignal<DropdownItem<T> | undefined> = signal(undefined);
    gesorteerdeItems = computed(() => {
        const sorteerItemsFn = this.config()?.sorteerItemsFn;
        if (sorteerItemsFn) return sorteerItemsFn(this.items());

        return this.items();
    });

    @HostBinding('class.hoverable') meerdereItems = false;
    @HostBinding('class.popup-open') _popupOpen = false;

    @HostBinding('attr.role') _role = 'listbox';
    @HostBinding('attr.aria-label')
    get omschrijving() {
        const geselecteerdeItem = this.geselecteerdeItem();
        if (!geselecteerdeItem) {
            return this.config()?.geenItemLabel ?? 'Geen item';
        } else {
            return geselecteerdeItem.label;
        }
    }
    public sortedItems: DropdownItem<T>[] = [];

    private _itemPopupUuid: string | undefined;

    constructor() {
        onRefresh((reason) => {
            if (reason === RefreshReason.LEERLING_SWITCH) {
                this.itemGewisseld.emit(undefined);
                const queryParams: Params = {};
                queryParams[DROPDOWN_ITEM_QUERY_PARAM] = null;

                this._router.navigate([], { queryParams, queryParamsHandling: 'merge' });
            }
        });
    }

    protected getDefaultItem(items: DropdownItem<T>[]): DropdownItem<T> | undefined {
        const getDefaultItemFn = this.config()?.getDefaultItemFn;
        if (getDefaultItemFn) return getDefaultItemFn(items);

        if (items.length === 0) return undefined;

        return items[0];
    }

    ngOnInit() {
        this._activatedRoute.queryParams.pipe(map((params) => params[DROPDOWN_ITEM_QUERY_PARAM])).subscribe((itemParam) => {
            const huidigeItemIdentifier = this.geselecteerdeItem()?.identifier;
            this.geselecteerdeItem.set(
                itemParam ? this.items().find((item) => item.identifier === itemParam) : this.getDefaultItem(this.items())
            );

            if (this.geselecteerdeItem()?.identifier !== huidigeItemIdentifier) {
                this.itemGewisseld.emit(this.geselecteerdeItem());
                this._changeDetector.detectChanges();
            }
        });

        this._popupService.openPopups$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((openPopups) => {
            this._popupOpen = openPopups.some((popupRef) => popupRef.instance.connectedElement === this._viewContainerRef);
        });
        this.meerdereItems = this.items().length > 1;
    }

    ngOnChanges() {
        if (!this.items().some((item) => item.identifier === this.geselecteerdeItem()?.identifier)) {
            this.geselecteerdeItem.set(undefined);
        }

        if (!this.geselecteerdeItem()) {
            const itemParam = this._activatedRoute.snapshot.queryParamMap.get(DROPDOWN_ITEM_QUERY_PARAM);
            this.geselecteerdeItem.set(
                itemParam
                    ? (this.items().find((item: DropdownItem<T>) => item.identifier === itemParam) ?? this.items()[0])
                    : this.getDefaultItem(this.items())
            );

            if (this.geselecteerdeItem()) {
                this.itemGewisseld.emit(this.geselecteerdeItem());
            }
        }
        this.meerdereItems = this.items().length > 1;
    }

    @HostListener('click') onClick() {
        if (!this.meerdereItems) return;

        const popup = this._popupService.popup(
            DropdownListComponent,
            {
                dropdownItems: this.gesorteerdeItems(),
                actieveItem: this.geselecteerdeItem()
            },
            this._viewContainerRef,
            createPopupSettings({
                alignment: 'start',
                keepOnNavigation: true
            })
        );
        this._itemPopupUuid = popup.uuid;
        popup.component.itemGewisseld.subscribe((item) => {
            this._changeDetector.detectChanges();
            const queryParams: Params = {};
            queryParams[DROPDOWN_ITEM_QUERY_PARAM] = item.identifier;

            this._router.navigate([], { queryParams: queryParams, queryParamsHandling: 'merge' });
            this._popupService.animateAndClose(popup.uuid);
            if (this._accessibilityService.isAccessedByKeyboard()) {
                this._viewContainerRef.element.nativeElement.focus();
            }
        });
    }

    ngOnDestroy(): void {
        if (this._itemPopupUuid) this._popupService.close(this._itemPopupUuid);
    }
}
