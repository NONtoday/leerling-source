import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    HostBinding,
    HostListener,
    ViewContainerRef,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import { IconDirective } from 'harmony';
import { IconChevronOnder, IconFilter, provideIcons } from 'harmony-icons';
import { OverlayService } from 'leerling-util';
import { SVakkeuze } from 'leerling/store';
import { SelectedFilters } from '../filter/filter';
import { StudiewijzerFilterDropdownComponent } from '../studiewijzer-filter-dropdown/studiewijzer-filter-dropdown.component';

@Component({
    selector: 'sl-studiewijzer-filter-button',
    imports: [CommonModule, IconDirective],
    templateUrl: './studiewijzer-filter-button.component.html',
    styleUrl: './studiewijzer-filter-button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronOnder, IconFilter)]
})
export class StudiewijzerFilterButtonComponent {
    vakkeuzes = input.required<SVakkeuze[]>();

    private _overlayService = inject(OverlayService);
    public viewContainerRef = inject(ViewContainerRef);

    public activeFilters = signal<SelectedFilters>({ swiType: [], vak: [] });
    public isPopupOpen = signal(false);

    public filters = output<SelectedFilters>();

    @HostBinding('class.popup-open') get popupOpen() {
        return this.isPopupOpen();
    }

    @HostBinding('class.active') get filtersActief() {
        return this.activeFilters().swiType.length || this.activeFilters().vak.length;
    }

    @HostListener('click')
    public openDropdown() {
        this.isPopupOpen.set(true);
        const dropdown = this._overlayService.popupOrModal(
            StudiewijzerFilterDropdownComponent,
            {
                vakkeuzes: this.vakkeuzes(),
                activeFilters: this.activeFilters()
            },
            { ...StudiewijzerFilterDropdownComponent.getPopupSettings(304), onClose: () => this.isPopupOpen.set(false) },
            StudiewijzerFilterDropdownComponent.getModalSettings(),
            this.viewContainerRef
        );

        dropdown.filters.subscribe((value) => {
            this.activeFilters.set(value);
            this.filters.emit(value);
        });
    }
}
