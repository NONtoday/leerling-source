import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
import { AccessibilityService, GeenDataComponent, KeyPressedService, onRefreshOrRedirectHome } from 'leerling-util';
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
import { BerichtDetailComponent, TABINDEX_BERICHT_DETAIL_CONTENT, TAGNAME_BERICHT_DETAIL } from './bericht-detail/bericht-detail.component';
import { BerichtNieuwComponent, TABINDEX_NIEUW_BERICHT } from './bericht-nieuw/bericht-nieuw.component';
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
    private accessibilityService = inject(AccessibilityService);
    private keyPressedService = inject(KeyPressedService);
    private berichtService = inject(BerichtService);
    private modalService = inject(ModalService);
    private rechtenService = inject(RechtenService);

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

    heeftBerichtenVerzendenRecht = toSignal(
        this.rechtenService.getCurrentAccountRechten().pipe(map((rechten) => Boolean(rechten.berichtenVerzendenAan))),
        { initialValue: false }
    );

    showNieuwBerichtForm = computed(() => this.editQueryParam() === BERICHTEN_NIEUW && this.heeftBerichtenVerzendenRecht());

    reactieOpBericht = computed(() => {
        // rechten check hier en niet met heeftRecht directive, omdat je dan een leeg detail krijgt bij een invalide url
        const gevondenBericht = this.heeftBerichtenVerzendenRecht()
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
        this.keyPressedService.mainKeyboardEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
            const target = event.target as HTMLElement;
            if (
                KeyPressedService.isShiftTabEvent(event) &&
                this.accessibilityService.isAccessedByKeyboard() &&
                target.tagName.toLocaleLowerCase() === TAGNAME_BERICHT_DETAIL
            ) {
                event.preventDefault();
                event.stopPropagation();
                setTimeout(() => {
                    this.accessibilityService.focusElementWithTabIndex(TABINDEX_BERICHT_SAMENVATTING);
                });
            }
        });
    }

    navigateToTab(link: BerichtenTabLink) {
        this.router.navigateByUrl(`${BERICHTEN}/${link}`);
        setTimeout(() => {
            if (this.accessibilityService.isAccessedByKeyboard()) {
                this.accessibilityService.focusElementWithTabIndex(TABINDEX_BERICHT_SAMENVATTING);
            }
        });
    }

    startNieuwBericht() {
        this.router.navigate([], { queryParams: { edit: 'nieuw' } });
        setTimeout(() => {
            if (this.accessibilityService.isAccessedByKeyboard()) {
                this.accessibilityService.focusElementWithTabIndex(TABINDEX_NIEUW_BERICHT);
            }
        });
    }

    laadEerdereBerichten() {
        this.berichtService.refreshConversaties({ alleConversaties: true });
    }

    selectConversatie(conversatie: SConversatie) {
        if (this.selectedConversatie()?.id === conversatie.id) return;
        this.router.navigate([], { queryParams: { conversatie: conversatie.id } });

        this.datumOudsteOngelezenBoodschap.set(conversatie.datumOudsteOngelezenBoodschap);
        this.berichtService.markeerGelezen(conversatie);
        setTimeout(() => {
            if (this.accessibilityService.isAccessedByKeyboard()) {
                this.accessibilityService.focusElementWithTabIndex(TABINDEX_BERICHT_DETAIL_CONTENT);
            }
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
