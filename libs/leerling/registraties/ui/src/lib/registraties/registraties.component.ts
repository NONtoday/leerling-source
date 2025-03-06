import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    ButtonComponent,
    DeviceService,
    DropdownComponent,
    DropdownItem,
    RegistratieCategorie,
    RegistratieCategorieComponent,
    SpinnerComponent,
    isPresent
} from 'harmony';
import { IconKalenderToevoegen, provideIcons } from 'harmony-icons';
import { RouterService } from 'leerling-base';
import {
    LOCALSTORAGE_KEY_TIJDSPAN,
    SRegistratie,
    SRegistratieCategorieNaam,
    SRegistratiePeriode,
    SRegistraties,
    getRegistratieCategorieNaam,
    getSlugifiedCategorieNaam,
    registratiePeriodes
} from 'leerling-registraties-models';
import { RefreshReason, SidebarService, createSidebarSettings, isWeb, onRefresh } from 'leerling-util';
import { RechtenService } from 'leerling/store';
import { last } from 'lodash-es';
import { NgStringPipesModule } from 'ngx-pipes';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { RegistratiesListComponent } from './registraties-list/registraties-list.component';

@Component({
    selector: 'sl-registraties',
    imports: [CommonModule, SpinnerComponent, DropdownComponent, RegistratieCategorieComponent, NgStringPipesModule, ButtonComponent],
    templateUrl: './registraties.component.html',
    styleUrl: './registraties.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconKalenderToevoegen)]
})
export class RegistratiesComponent {
    private readonly sidebarService = inject(SidebarService);

    private _rechtenService = inject(RechtenService);
    private _deviceService = inject(DeviceService);
    private _routerService = inject(RouterService);

    private _detail = injectQueryParams('detail');

    private _isVerzorger = toSignal(this._rechtenService.currentAccountIsVerzorger());
    private _heeftMeldingMakenRecht = toSignal(this._rechtenService.heeftRecht('magAbsentiemeldingMaken'));
    toonAbsentieToevoegen = computed(
        () => this._isVerzorger() && this._heeftMeldingMakenRecht() && this._deviceService.isTabletOrDesktopSignal()
    );

    tijdspan = input.required<(typeof registratiePeriodes)[number]>();
    registraties = input.required<SRegistraties | undefined>();
    isLoading = input.required<boolean>();
    onSelectTijdspan = output<SRegistratiePeriode>();

    registratieMap = computed(() => {
        const registraties = this.registraties();
        const map = new Map<SRegistratieCategorieNaam, SRegistratie[]>();
        if (registraties) {
            if (registraties.afwezigWaarnemingen.length) map.set('Afwezig', registraties.afwezigWaarnemingen);
            if (registraties.ongeoorloofdAfwezig.length) map.set('Afwezig ongeoorloofd', registraties.ongeoorloofdAfwezig);
            if (registraties.geoorloofdAfwezig.length) map.set('Afwezig geoorloofd', registraties.geoorloofdAfwezig);
            if (registraties.teLaat.length) map.set('Te laat', registraties.teLaat);
            if (registraties.verwijderd.length) map.set('Verwijderd uit les', registraties.verwijderd);
            if (registraties.huiswerkNietInOrde.length) map.set('Huiswerk niet in orde', registraties.huiswerkNietInOrde);
            if (registraties.materiaalNietInOrde.length) map.set('Materiaal niet in orde', registraties.materiaalNietInOrde);
        }
        return map;
    });

    heeftRegistraties = computed(() => this.registratieMap().size > 0);
    categorieen: Signal<any[]> = computed(() =>
        [
            this.mapCategorie('Afwezig', this.registraties()?.afwezigWaarnemingen),
            this.mapCategorie('Afwezig ongeoorloofd', this.registraties()?.ongeoorloofdAfwezig),
            this.mapCategorie('Afwezig geoorloofd', this.registraties()?.geoorloofdAfwezig),
            this.mapCategorie('Te laat', this.registraties()?.teLaat),
            this.mapCategorie('Verwijderd uit les', this.registraties()?.verwijderd),
            this.mapCategorie('Huiswerk niet in orde', this.registraties()?.huiswerkNietInOrde),
            this.mapCategorie('Materiaal niet in orde', this.registraties()?.materiaalNietInOrde)
        ].filter(isPresent)
    );

    dropdownItems: DropdownItem<SRegistratiePeriode>[] = registratiePeriodes.map((periode) => ({ label: periode, data: periode }));
    selectedItem =
        this.dropdownItems.find((item) => item.data === localStorage.getItem(LOCALSTORAGE_KEY_TIJDSPAN)) ?? last(this.dropdownItems);
    isSideBarOpen = signal(false);

    constructor() {
        // Bij een binnenkomend pushbericht kan het zijn dat we van leerling switchen, in dat geval moet de sidebar dicht
        if (!isWeb()) {
            onRefresh((reason) => {
                if (reason === RefreshReason.LEERLING_SWITCH && this.isSideBarOpen()) {
                    this.sidebarService.close(true, 'navigation');
                }
            });
        }
        effect(() => {
            const categorienaam = getRegistratieCategorieNaam(this._detail());
            if (categorienaam && !this.isLoading()) {
                // setTimeout benodigd voor om loop te voorkomen
                setTimeout(() => {
                    this.executeOpenSidebar(categorienaam);
                });
            } else {
                this.sidebarService.animateAndClose();
            }
        });
    }

    openSidebar(categorie: SRegistratieCategorieNaam) {
        this._routerService.router.navigate([], {
            queryParams: {
                detail: getSlugifiedCategorieNaam(categorie)
            },
            queryParamsHandling: 'merge'
        });
    }

    private executeOpenSidebar(categorie: SRegistratieCategorieNaam) {
        const input = computed(() => ({
            categorie,
            registraties: this.registratieMap().get(categorie) ?? []
        }));

        if ((input().registraties?.length ?? 0) === 0) return;

        this.sidebarService.push(
            RegistratiesListComponent,
            computed(() => ({
                categorie,
                registraties: this.registratieMap().get(categorie) ?? []
            })),
            createSidebarSettings({ title: categorie, hasBookmarkableUrl: true }),
            () => {
                this.isSideBarOpen.set(false);
            }
        );
        this.isSideBarOpen.set(true);
    }

    selectTijdspan(periode: SRegistratiePeriode | undefined) {
        if (!periode) return;
        this.onSelectTijdspan.emit(periode);
    }

    naarAfwezigMelden() {
        this._routerService.routeToAbsentieMelden();
    }

    private mapCategorie(naam: RegistratieCategorie, values?: any[]) {
        if (!values || values.length === 0) return undefined;
        return {
            naam,
            aantal: values.length
        };
    }
}
