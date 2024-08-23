import { AsyncPipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
    DeviceService,
    IconDirective,
    ModalService,
    NotificationCounterTabInput,
    SpinnerComponent,
    TabComponent,
    TabInput,
    TooltipDirective,
    createModalSettings,
    createNotificationCounterTab
} from 'harmony';
import { IconMarkerenOngelezen, IconNieuwBericht, IconVerwijderen, IconVerzenden, IconWaarschuwing, provideIcons } from 'harmony-icons';
import { AppStatusService } from 'leerling-app-status';
import {
    BERICHTEN,
    BERICHTEN_EDIT,
    BERICHTEN_NIEUW,
    BERICHTEN_POSTVAK_IN,
    BERICHTEN_VERZONDEN_ITEMS,
    TabBarComponent,
    registerContextSwitchInterceptor
} from 'leerling-base';
import { REloRestricties } from 'leerling-codegen';
import { HeaderActionButtonComponent, HeaderComponent, ScrollableTitleComponent } from 'leerling-header';
import { GeenDataComponent, onRefreshOrRedirectHome } from 'leerling-util';
import {
    HeeftRechtDirective,
    NieuwBerichtInput,
    ReactieBerichtInput,
    RechtenService,
    SConversatie,
    kanReagerenOpBoodschap
} from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { injectQueryParams } from 'ngxtension/inject-query-params';
import { Observable, map, tap } from 'rxjs';
import { match } from 'ts-pattern';
import { BerichtService } from '../../services/bericht.service';
import { BerichtBeantwoordenComponent } from './bericht-beantwoorden/bericht-beantwoorden.component';
import { BerichtDetailComponent } from './bericht-detail/bericht-detail.component';
import { BerichtNieuwComponent } from './bericht-nieuw/bericht-nieuw.component';
import { BerichtSamenvattingComponent } from './bericht-samenvatting/bericht-samenvatting.component';

@Component({
    selector: 'sl-berichten',
    standalone: true,
    imports: [
        AsyncPipe,
        HeaderComponent,
        HeaderActionButtonComponent,
        HeeftRechtDirective,
        IconDirective,
        ScrollableTitleComponent,
        TabComponent,
        BerichtSamenvattingComponent,
        TabBarComponent,
        BerichtDetailComponent,
        SpinnerComponent,
        GeenDataComponent,
        BerichtNieuwComponent,
        TooltipDirective,
        BerichtBeantwoordenComponent
    ],
    providers: [provideIcons(IconNieuwBericht, IconVerzenden, IconWaarschuwing, IconMarkerenOngelezen, IconVerwijderen), BerichtService],
    templateUrl: './berichten.component.html',
    styleUrl: './berichten.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BerichtenComponent {
    public static BERICHTENFEATURE: keyof REloRestricties = 'berichtenBekijkenAan';
    tabindexBerichtSamenvatting = TABINDEX_BERICHT_SAMENVATTING;

    private deviceService = inject(DeviceService);
    private router = inject(Router);
    private berichtService = inject(BerichtService);
    private modalService = inject(ModalService);
    private rechtenService = inject(RechtenService);
    private document = inject(DOCUMENT);

    public alleBerichtenLaden = signal(false);
    public geenNieuweBerichten = signal(false);

    // named route path param, see routes in leerling app
    activeTab = input.required<BerichtenTabLink>();
    selectedConversatieId = injectQueryParams('conversatie');

    berichtEditComponent = viewChild(BerichtNieuwComponent, { read: BerichtNieuwComponent });
    beantwoordBerichtComponent = viewChild(BerichtBeantwoordenComponent, { read: BerichtBeantwoordenComponent });

    editQueryParam = injectQueryParams(BERICHTEN_EDIT);
    isPhoneOrTabletPortrait = toSignal(this.deviceService.isPhoneOrTabletPortrait$);
    conversaties = derivedAsync<SConversatie[] | undefined>(() =>
        this.activeTab() === 'postvak-in' ? this.berichtService.postvakIn() : this.berichtService.postvakUit()
    );
    selectedConversatie = computed(() => this.conversaties()?.find((c: SConversatie) => String(c.id) === this.selectedConversatieId()));
    datumOudsteOngelezenBoodschap = signal<Date | undefined>(undefined);
    alleConversatiesOpgehaald = derivedAsync<boolean | undefined>(() => this.berichtService.alleConversatiesOpgehaald());

    heeftBerichtenBekijkenRecht = toSignal(
        this.rechtenService.getCurrentAccountRechten().pipe(map((rechten) => Boolean(rechten.berichtenBekijkenAan))),
        { initialValue: false }
    );

    heeftBerichtenVerzendenRecht = toSignal(
        this.rechtenService.getCurrentAccountRechten().pipe(map((rechten) => Boolean(rechten.berichtenVerzendenAan))),
        { initialValue: false }
    );

    showNieuwBerichtForm = computed(() => this.editQueryParam() === BERICHTEN_NIEUW && this.heeftBerichtenVerzendenRecht());

    reactieOpBericht = computed(() => {
        const gevondenBericht =
            this.editQueryParam() !== BERICHTEN_NIEUW
                ? this.conversaties()
                      ?.flatMap((c) => c.boodschappen)
                      .find((b) => b.id.toString() === this.editQueryParam())
                : undefined;

        return gevondenBericht && kanReagerenOpBoodschap(gevondenBericht) ? gevondenBericht : undefined;
    });
    inEdit = computed(() => this.reactieOpBericht() || this.editQueryParam() === BERICHTEN_NIEUW);

    isOnline = inject(AppStatusService).isOnlineSignal();

    tabs = derivedAsync<ReadonlyArray<BerichtenTabInput>>(() =>
        this.berichtService.aantalOngelezenConversatiesPostvakIn().pipe(
            map((aantalOngelezen) =>
                [BERICHTEN_POSTVAK_IN, BERICHTEN_VERZONDEN_ITEMS].map((link: BerichtenTabLink) => ({
                    link,
                    label: match(link)
                        .with(BERICHTEN_POSTVAK_IN, () => 'Postvak IN')
                        .with(BERICHTEN_VERZONDEN_ITEMS, () => 'Verzonden Items')
                        .exhaustive(),
                    notification: link === BERICHTEN_POSTVAK_IN ? this.createTabCounter(aantalOngelezen) : undefined
                }))
            )
        )
    );

    constructor() {
        onRefreshOrRedirectHome([BerichtenComponent.BERICHTENFEATURE], () => this.berichtService.refreshConversaties());
        registerContextSwitchInterceptor(() => this.canDeactivate());
        this.berichtService.refreshConversaties();
    }

    navigateToTab(link: BerichtenTabLink) {
        this.router.navigateByUrl(`${BERICHTEN}/${link}`);
        // De settimeout is nodig omdat de items nog niet zijn geupdate en hij dus de oude selecteert
        setTimeout(() => {
            // als de guard open staat, focus niet verplaatsen.
            if (!this.modalService.isOpen()) this.focusEersteInboxBericht();
        });
    }

    startNieuwBericht() {
        this.router.navigate([], { queryParams: { edit: 'nieuw' } });
    }

    focusEersteInboxBericht = () => (<HTMLElement>this.document.querySelector('sl-bericht-samenvatting:first-of-type'))?.focus();
    focusLaatsteInboxBericht = () => (<HTMLElement>this.document.querySelector('sl-bericht-samenvatting:last-of-type'))?.focus();

    laadEerdereBerichten() {
        if (this.geenNieuweBerichten()) return;
        const aantalBerichten = this.conversaties()?.length;
        this.alleBerichtenLaden.set(true);
        this.berichtService.refreshConversaties({ alleConversaties: true }).subscribe(() => {
            this.alleBerichtenLaden.set(false);
            if (this.conversaties()?.length === aantalBerichten) {
                this.geenNieuweBerichten.set(true);
            }
        });

        (<HTMLElement>this.document.querySelector('.laad-eerdere'))?.blur();
        this.focusLaatsteInboxBericht();
    }

    selectConversatie(conversatie: SConversatie) {
        if (this.selectedConversatie()?.id === conversatie.id) return;
        this.router.navigate([], { queryParams: { conversatie: conversatie.id } });

        this.datumOudsteOngelezenBoodschap.set(conversatie.datumOudsteOngelezenBoodschap);
        this.berichtService.markeerGelezen(conversatie);

        // de setTimeout is omdat wanneer detail nog niet bestaat de focus te snel is.
        setTimeout(() => {
            this.document.getElementById('bericht-thread-titel')?.focus();
        });
    }

    verstuurReactie(bericht: ReactieBerichtInput) {
        const selectedConversatie = this.selectedConversatie();
        if (!selectedConversatie) return;

        this.berichtService.verstuurReactieBericht(selectedConversatie, bericht);
        this.router.navigate([], { queryParams: { edit: null }, queryParamsHandling: 'merge' });
    }

    verstuurBericht(bericht: NieuwBerichtInput) {
        this.berichtService.verstuurNieuwBericht(bericht);
        this.router.navigate([], { queryParams: {} });
    }

    // implementatie van ConfirmDeactivatableGuard bij nieuw bericht
    canDeactivate(): boolean | Observable<boolean> {
        if (!this.heeftBerichtenBekijkenRecht()) return true;
        const editComponent = this.berichtEditComponent();
        const beantwoordComponent = this.beantwoordBerichtComponent();
        if (!editComponent?.formIsDirty() && !beantwoordComponent?.formIsDirty()) return true;
        if (this.modalService.isOpen()) return false;

        return this.modalService
            .confirmModal(
                {
                    text: 'Dit bericht is niet verzonden en wordt niet opgeslagen',
                    annulerenButtonText: 'Annuleren',
                    bevestigenButtonText: 'Bericht verwijderen',
                    bevestigenButtonMode: 'delete'
                },
                createModalSettings({
                    title: 'Weet je het zeker?',
                    widthModal: '460px',
                    titleIcon: this.deviceService.isPhoneOrTabletPortrait() ? undefined : 'waarschuwing',
                    titleIconColor: 'fg-negative-normal'
                })
            )
            .confirmResult.pipe(
                map((result) => result === 'Positive'),
                tap((canClose) => {
                    if (canClose) {
                        editComponent?.resetForm();
                        beantwoordComponent?.resetForm();
                    }
                })
            );
    }

    markeerGelezen(conversatie: SConversatie) {
        this.berichtService.markeerGelezen(conversatie);
    }

    markeerOngelezen(conversatie: SConversatie) {
        this.berichtService.markeerOngelezen(conversatie);
        this.router.navigate([], { queryParams: { conversatie: undefined }, queryParamsHandling: 'merge' });
    }

    verwijder(conversatie: SConversatie) {
        this.berichtService.verwijderen(conversatie);
        this.router.navigate([], { queryParams: { conversatie: undefined }, queryParamsHandling: 'merge' });
    }

    private createTabCounter(count: number): NotificationCounterTabInput | undefined {
        // alleen counter laten zien bij minimaal 1 ongelezen conversatie
        return count < 1
            ? undefined
            : createNotificationCounterTab({
                  count,
                  inverted: false,
                  color: 'warning',
                  countLabel: count === 1 ? 'ongelezen bericht' : 'ongelezen berichten'
              });
    }
}

const TABINDEX_BERICHT_SAMENVATTING = 104;

export type BerichtenTabLink = typeof BERICHTEN_POSTVAK_IN | typeof BERICHTEN_VERZONDEN_ITEMS;

interface BerichtenTabInput extends TabInput {
    link: BerichtenTabLink;
    notification?: NotificationCounterTabInput;
}
