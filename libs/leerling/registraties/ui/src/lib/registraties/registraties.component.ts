import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DropdownComponent, DropdownItem, RegistratieCategorieComponent, SpinnerComponent } from 'harmony';

import { LOCALSTORAGE_KEY_TIJDSPAN, SRegistratieCategorie, SRegistratiePeriode, registratiePeriodes } from 'leerling-registraties-models';
import { SidebarService, createSidebarSettings } from 'leerling-util';
import { last } from 'lodash-es';
import { NgStringPipesModule } from 'ngx-pipes';
import { RegistratiesListComponent } from './registraties-list/registraties-list.component';

@Component({
    selector: 'sl-registraties',
    standalone: true,
    imports: [CommonModule, SpinnerComponent, DropdownComponent, RegistratieCategorieComponent, NgStringPipesModule],
    templateUrl: './registraties.component.html',
    styleUrl: './registraties.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistratiesComponent {
    private readonly sidebarService = inject(SidebarService);

    tijdspan = input.required<(typeof registratiePeriodes)[number]>();
    registratieCategorieeen = input.required<SRegistratieCategorie[] | undefined>();
    isLoading = input.required<boolean>();
    onSelectTijdspan = output<SRegistratiePeriode>();

    heeftRegistraties = computed(() => this.registratieCategorieeen()?.some((c) => c.aantal > 0));

    dropdownItems: DropdownItem<SRegistratiePeriode>[] = registratiePeriodes.map((periode) => ({ label: periode, data: periode }));
    selectedItem =
        this.dropdownItems.find((item) => item.data === localStorage.getItem(LOCALSTORAGE_KEY_TIJDSPAN)) ?? last(this.dropdownItems);

    openRegistratiesSidebar(categorie: SRegistratieCategorie) {
        if (categorie.aantal === 0) return;
        this.sidebarService.push(
            RegistratiesListComponent,
            { registratieCategorie: categorie },
            createSidebarSettings({ title: categorie.naam })
        );
    }

    selectTijdspan(periode: SRegistratiePeriode | undefined) {
        if (!periode) return;
        this.onSelectTijdspan.emit(periode);
    }
}
