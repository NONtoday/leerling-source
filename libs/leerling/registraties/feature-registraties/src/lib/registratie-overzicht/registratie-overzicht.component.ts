import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent, DropdownComponent, RegistratieCategorieComponent, SpinnerComponent, isPresent } from 'harmony';
import { IconMaatregel, provideIcons } from 'harmony-icons';
import { TabBarComponent } from 'leerling-base';
import { HeaderComponent, ScrollableTitleComponent } from 'leerling-header';
import { RegistratiesService } from 'leerling-registraties-data-access';
import { LOCALSTORAGE_KEY_TIJDSPAN, SRegistratiePeriode } from 'leerling-registraties-models';
import { MaatregelenComponent, RegistratiesComponent } from 'leerling-registraties-ui';
import { NgStringPipesModule } from 'ngx-pipes';
import { derivedAsync } from 'ngxtension/derived-async';
import { filterArray } from 'ngxtension/filter-array';
import { filter } from 'rxjs';

@Component({
    selector: 'sl-registratie-overzicht',
    standalone: true,
    imports: [
        CommonModule,
        HeaderComponent,
        ScrollableTitleComponent,
        SpinnerComponent,
        RegistratieCategorieComponent,
        TabBarComponent,
        ButtonComponent,
        DropdownComponent,
        NgStringPipesModule,
        MaatregelenComponent,
        RegistratiesComponent
    ],
    providers: [provideIcons(IconMaatregel)],
    templateUrl: './registratie-overzicht.component.html',
    styleUrl: './registratie-overzicht.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistratieOverzichtComponent {
    private readonly registratieService = inject(RegistratiesService);

    tijdspan = toSignal(this.registratieService.tijdspan(), { initialValue: 'Laatste 7 dagen' });
    registratieCategorieeen = derivedAsync(() =>
        this.registratieService.registratiesCategorieen(this.tijdspan())?.pipe(
            filter(isPresent),
            filterArray((c) => c.aantal !== 0)
        )
    );
    maatregelToekenningen = derivedAsync(() => this.registratieService.getActieveMaatregelen());

    constructor() {
        const storageTijdspan = localStorage.getItem(LOCALSTORAGE_KEY_TIJDSPAN) as SRegistratiePeriode | null;
        this.registratieService.selectTijdspanRefreshRegistraties(storageTijdspan ?? 'Dit schooljaar');
        this.registratieService.refreshMaatregelen();
    }

    selectTijdspan(periode: SRegistratiePeriode) {
        this.registratieService.selectTijdspanRefreshRegistraties(periode);
    }
}
