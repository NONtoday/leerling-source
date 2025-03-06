import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent, DeviceService, isPresent } from 'harmony';
import { IconKalenderToevoegen, IconMaatregel, provideIcons } from 'harmony-icons';
import { RouterService, TabBarComponent } from 'leerling-base';
import { HeaderComponent, ScrollableTitleComponent } from 'leerling-header';
import { RegistratiesService } from 'leerling-registraties-data-access';
import { LOCALSTORAGE_KEY_TIJDSPAN, SRegistratiePeriode } from 'leerling-registraties-models';
import { MaatregelenComponent, RegistratiesComponent } from 'leerling-registraties-ui';
import { onRefreshOrRedirectHomeVerify } from 'leerling-util';
import {
    RechtenService,
    verifyMaatregelRechten,
    verifyRedirectNaarAbsentiemelden,
    verifyRegistratieOverzichtRechten,
    verifyRegistratiesRechten
} from 'leerling/store';
import { NgStringPipesModule } from 'ngx-pipes';
import { derivedAsync } from 'ngxtension/derived-async';
import { filter, map } from 'rxjs';

@Component({
    selector: 'sl-registratie-overzicht',
    imports: [
        CommonModule,
        HeaderComponent,
        ScrollableTitleComponent,
        TabBarComponent,
        NgStringPipesModule,
        MaatregelenComponent,
        RegistratiesComponent,
        ButtonComponent
    ],
    providers: [provideIcons(IconMaatregel, IconKalenderToevoegen)],
    templateUrl: './registratie-overzicht.component.html',
    styleUrl: './registratie-overzicht.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistratieOverzichtComponent {
    private readonly registratieService = inject(RegistratiesService);
    private _rechtenService = inject(RechtenService);
    private _routerService = inject(RouterService);
    private _deviceService = inject(DeviceService);

    private _isVerzorger = toSignal(this._rechtenService.currentAccountIsVerzorger());
    private _heeftMeldingMakenRecht = toSignal(this._rechtenService.heeftRecht('magAbsentiemeldingMaken'));
    toonAbsentieToevoegen = computed(
        () => this._isVerzorger() && this._heeftMeldingMakenRecht() && this._deviceService.isPhoneOrTabletPortraitSignal()
    );

    tijdspan = toSignal(this.registratieService.tijdspan(), { initialValue: 'Laatste 7 dagen' });
    registraties = derivedAsync(() => this.registratieService.registratiesCategorieen(this.tijdspan())?.pipe(filter(isPresent)));

    maatregelToekenningen = derivedAsync(() => this.registratieService.getActieveMaatregelen());
    registratiesIsLoading = derivedAsync(() => this.registratieService.isLoading(), { initialValue: false });

    private accountContextMetRechten$ = this._rechtenService.getAccountContextMetRechten();
    public heeftRegistratiesRechten = toSignal(this.accountContextMetRechten$.pipe(map(verifyRegistratiesRechten)));
    public heeftMaatregelRechten = toSignal(this.accountContextMetRechten$.pipe(map((acmr) => verifyMaatregelRechten(acmr.rechten))));

    constructor() {
        if (verifyRedirectNaarAbsentiemelden(this._rechtenService.getAccountContextMetRechtenSnapshot())) {
            this.naarAfwezigMelden();
            return;
        }
        onRefreshOrRedirectHomeVerify(verifyRegistratieOverzichtRechten, () => this.refreshState());
        this.refreshState();
    }

    private refreshState() {
        if (this.heeftRegistratiesRechten()) {
            const storageTijdspan = localStorage.getItem(LOCALSTORAGE_KEY_TIJDSPAN) as SRegistratiePeriode | null;
            this.registratieService.selectTijdspanRefreshRegistraties(storageTijdspan ?? 'Dit schooljaar');
        }

        if (this.heeftMaatregelRechten()) {
            this.registratieService.refreshMaatregelen();
        }
    }

    selectTijdspan(periode: SRegistratiePeriode) {
        this.registratieService.selectTijdspanRefreshRegistraties(periode);
    }

    naarAfwezigMelden() {
        this._routerService.routeToAbsentieMelden();
    }
}
