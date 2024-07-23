import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EmbeddedViewRef,
    TemplateRef,
    ViewContainerRef,
    computed,
    inject,
    input,
    model,
    output,
    signal,
    viewChild
} from '@angular/core';
import { IconChevronBoven, IconChevronOnder, provideIcons } from 'harmony-icons';
import { Pattern, match } from 'ts-pattern';
import { ButtonComponent } from '../button/button.component';
import { IconDirective, IconSize } from '../icon/icon.directive';
import { ModalSettings, createModalSettings } from '../overlay/modal/component/modal.settings';
import { OverlayService } from '../overlay/overlay.service';
import { PopupService } from '../overlay/popup/service/popup.service';
import { PopupSettings, createPopupSettings } from '../overlay/popup/settings/popup-settings';
import { DeviceService } from '../services/device.service';
import { DropdownItemComponent } from './dropdown-item/dropdown-item.component';
import { DropdownItem } from './dropdown.model';

const DEFAULT_LIST_ALIGNMENT: PopupSettings['alignment'] = 'start';
const DEFAULT_LIST_HEIGHT = 'fit-options';
const DEFAULT_LIST_WIDTH = 'fit-dropdown';
const DEFAULT_NO_ITEMS_PLACEHOLDER = 'Geen opties beschikbaar';
const DEFAULT_PLACEHOLDER = 'Kies een optie';
const DEFAULT_SIZE = 'medium';
const DEFAULT_TABINDEX = '0';

@Component({
    selector: 'hmy-dropdown',
    standalone: true,
    imports: [CommonModule, IconDirective, ButtonComponent, DropdownItemComponent, CdkTrapFocus],
    providers: [provideIcons(IconChevronOnder, IconChevronBoven)],
    templateUrl: './dropdown.component.html',
    styleUrl: './dropdown.component.scss',
    host: {
        '[class.small]': "size() === 'small'",
        '[class.medium]': "size() === 'medium'"
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownComponent<T> {
    private dropdownBox = viewChild.required('dropdownBox', { read: ViewContainerRef });
    private dropdownList = viewChild.required('dropdownList', { read: TemplateRef });
    public deviceService = inject(DeviceService);
    private overlayService = inject(OverlayService);
    private popupService = inject(PopupService);

    public label = input<string | undefined>();
    public placeholder = input(DEFAULT_PLACEHOLDER);
    public items = input.required<DropdownItem<T>[]>();
    public selected = model<DropdownItem<T> | undefined>();
    public noItemsPlaceholder = input(DEFAULT_NO_ITEMS_PLACEHOLDER);
    public customTabindex = input(DEFAULT_TABINDEX);
    public size = input<'small' | 'medium'>(DEFAULT_SIZE);
    public listWidth = input<'fit-dropdown' | 'fit-options' | number>(DEFAULT_LIST_WIDTH);
    public listHeight = input<'fit-options' | number>(DEFAULT_LIST_HEIGHT);
    public modalOnMobile = input(false);
    public listAlignment = input<PopupSettings['alignment']>(DEFAULT_LIST_ALIGNMENT);
    public mobileModalTitle = input<string | undefined>();
    public buttonHeight = input<number>(48);

    public onSelectionChanged = output<T>();

    iconSize = computed(() => {
        return match(this.size())
            .returnType<IconSize>()
            .with('small', () => 'smallest')
            .with('medium', () => 'medium')
            .exhaustive();
    });
    isOpen = signal(false);

    constructor() {
        this.selected.subscribe((selected) => {
            this.closeOptionsList();
            if (selected) {
                this.onSelectionChanged.emit(selected.data);
            }
        });
    }

    private getListWidthValue(boxWidth: number): string {
        return match(this.listWidth())
            .with('fit-dropdown', () => `${boxWidth}px`)
            .with('fit-options', () => 'max-content')
            .with(Pattern.number, (n: number) => `${n}px`)
            .exhaustive();
    }

    private popupOrModal(
        template: TemplateRef<any>,
        modalOnMobile: boolean,
        dropdownBoxRef: ViewContainerRef,
        popupSettings: PopupSettings,
        modalSettings: ModalSettings
    ): EmbeddedViewRef<any> {
        if (modalOnMobile) {
            return this.overlayService.popupOrModal(template, dropdownBoxRef, { context: {} }, popupSettings, modalSettings);
        }
        return this.popupService.popup(template, dropdownBoxRef, { context: {} }, popupSettings);
    }

    private scrollToSelected(hostElement: HTMLElement) {
        const containerElement = hostElement.querySelector('.dropdown-list-container') as HTMLElement;
        const selectedElement = hostElement.querySelector('.selected') as HTMLElement;
        if (containerElement && selectedElement) {
            selectedElement.focus({ preventScroll: true }); // Further tabs go to next element
            if (hostElement.classList.contains('in-modal')) {
                selectedElement.scrollIntoView();
                hostElement.scrollBy({ top: -8 }); // padding
            } else if (hostElement.classList.contains('in-popup')) {
                containerElement.scrollBy({ top: selectedElement.offsetTop - 8 }); // offset - padding
            }
        }
    }

    getDropdownBoxAriaLabel() {
        if (this.selected()) {
            return this.selected()?.label + ' is geselecteerd';
        }
        return this.placeholder();
    }

    getListHeightValue = computed(() => {
        return match(this.listHeight())
            .with('fit-options', () => 'max-content')
            .with(Pattern.number, (n: number) => `${n}px`)
            .exhaustive();
    });

    closeOptionsList = () => this.overlayService.close(this.dropdownBox());

    openOptionsList() {
        const dropdownBoxRef = this.dropdownBox();
        const listTemplate = this.dropdownList();
        if (!dropdownBoxRef || !listTemplate) return;

        const boxWidth = dropdownBoxRef.element.nativeElement.clientWidth;
        const listWidth = this.getListWidthValue(boxWidth);

        const listElement = this.popupOrModal(
            listTemplate,
            this.modalOnMobile(),
            dropdownBoxRef,
            createPopupSettings({
                position: 'under',
                alignment: this.listAlignment(),
                width: listWidth,
                onClose: () => this.isOpen.set(false)
            }),
            createModalSettings({
                title: this.mobileModalTitle(),
                onClose: () => this.isOpen.set(false)
            })
        );
        const listHost = listElement.rootNodes[0] as HTMLElement;

        const listClass = this.modalOnMobile() && this.deviceService.isPhoneOrTabletPortrait() ? 'in-modal' : 'in-popup';
        listHost.classList.add(listClass);

        // Delay needed because the list is not yet in place.
        setTimeout(() => {
            this.scrollToSelected(listHost);
        });

        this.isOpen.set(true);
    }

    select(item: DropdownItem<T>) {
        if (this.items().includes(item) && !item.disabled) {
            this.selected.set(item);
        }
    }
}
