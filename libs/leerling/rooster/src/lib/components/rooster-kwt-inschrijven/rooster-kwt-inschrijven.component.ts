import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnDestroy,
    OnInit,
    QueryList,
    ViewChildren,
    WritableSignal,
    computed,
    inject,
    input,
    signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofActionSuccessful } from '@ngxs/store';
import {
    ButtonComponent,
    DeviceService,
    ModalService as HarmonyModalService,
    IconDirective,
    MessageBarComponent,
    SpinnerComponent,
    createModalSettings
} from 'harmony';
import { IconInplannen, IconNoRadio, IconSluiten, IconVerversen, IconWaarschuwing, IconYesRadio, provideIcons } from 'harmony-icons';
import { AppStatusService } from 'leerling-app-status';
import { AuthenticationService } from 'leerling-authentication';
import {
    AccessibilityService,
    GuardableComponent,
    InfoMessageService,
    SidebarService,
    SidebarSettings,
    createSidebarSettings,
    formatDateNL
} from 'leerling-util';
import { KwtActieUitvoerenReady, SAfspraakActie, getJaarWeek } from 'leerling/store';
import { isEqual, sortBy } from 'lodash-es';
import { Observable, Subject, map, of, takeUntil } from 'rxjs';
import { RoosterItem } from '../../services/rooster-model';
import { RoosterService } from '../../services/rooster.service';
import { RoosterKwtKeuzeComponent } from '../rooster-kwt-keuze/rooster-kwt-keuze.component';
import { kwtKeuzeAriaLabelPipe } from './keuze-arialabel.pipe';

@Component({
    selector: 'sl-rooster-kwt-inschrijven',
    imports: [
        CommonModule,
        IconDirective,
        ButtonComponent,
        RoosterKwtKeuzeComponent,
        kwtKeuzeAriaLabelPipe,
        SpinnerComponent,
        MessageBarComponent
    ],
    templateUrl: './rooster-kwt-inschrijven.component.html',
    styleUrl: './rooster-kwt-inschrijven.component.scss',
    providers: [provideIcons(IconSluiten, IconInplannen, IconVerversen, IconNoRadio, IconYesRadio, IconWaarschuwing)],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterKwtInschrijvenComponent implements OnInit, OnDestroy, AfterViewInit, GuardableComponent {
    @ViewChildren(RoosterKwtKeuzeComponent) keuzeOpties: QueryList<RoosterKwtKeuzeComponent>;

    private _accessibilityService = inject(AccessibilityService);
    private _authenticationService = inject(AuthenticationService);
    private _infoMessageService = inject(InfoMessageService);
    private _sidebarService = inject(SidebarService);
    private _roosterService = inject(RoosterService);
    private _deviceService = inject(DeviceService);
    private _harmonyModalService = inject(HarmonyModalService);
    private _destroyRef = inject(DestroyRef);

    public roosterItem = input.required<RoosterItem>();
    public acties = computed(
        () =>
            sortBy(this.roosterItem().afspraakItem.kwtInfo?.afspraakActies, [
                (item) => item.beginDatumTijd,
                (item) => item.titel.toLowerCase()
            ]) || []
    );

    private onDestroy$ = new Subject<void>();
    private actions$ = inject(Actions);
    public isOnline = inject(AppStatusService).isOnlineSignal();
    public isOuderVerzorger = this._authenticationService.isCurrentContextOuderVerzorger;

    public kwtFoutmelding: WritableSignal<string | undefined> = signal(undefined);
    public actieGeselecteerd: WritableSignal<SAfspraakActie | undefined> = signal(undefined);

    public loading = signal(false);
    public isAccessedByClick = computed(() => this._accessibilityService.isAccessedByClick());
    public buttonLabel = computed(() => (this.actieGeselecteerd() ? `Inschrijven` : 'Maak een keuze'));
    public isDisabled = computed(() => {
        const geselecteerdeActie = this.actieGeselecteerd();
        return !geselecteerdeActie || geselecteerdeActie.ingeschreven;
    });

    public ngOnInit() {
        this.actions$
            .pipe(ofActionSuccessful(KwtActieUitvoerenReady), takeUntil(this.onDestroy$))
            .subscribe((action) => this.onKwtUitvoerenReady(action.foutmelding));

        this.registerGuard();
    }

    ngAfterViewInit() {
        this.roosterItem().afspraakItem?.kwtInfo?.afspraakActies.forEach((actie) => {
            if (actie.ingeschreven) {
                this.setActieGeselecteerd(actie);
            }
        });
    }

    private onKwtUitvoerenReady(foutmelding?: string) {
        this.setLoading(false);
        this.kwtFoutmelding.set(foutmelding);
        if (!foutmelding) {
            this.sluiten();
            this._infoMessageService.dispatchSuccessMessage('Inschrijven is gelukt!');
        }
    }

    public datumLabel(datum: Date): string {
        return formatDateNL(datum, 'dag_uitgeschreven_dagnummer_maand');
    }

    public sluiten() {
        if (this.loading()) return;
        this._sidebarService.animateAndClose();
    }

    public setActieGeselecteerd(value: SAfspraakActie) {
        if (this.loading()) return;
        this.selectItem(value);
        this.actieGeselecteerd.set(value);
    }

    public selectItem(geselecteerdeActie: SAfspraakActie) {
        this.kwtFoutmelding.set(undefined);
        this.keuzeOpties.forEach((optie) => optie.geselecteerd.set(isEqual(optie.afspraakActie(), geselecteerdeActie)));
    }

    public static getSidebarSettings(omschrijving: string): SidebarSettings {
        return createSidebarSettings({
            title: omschrijving,
            headerType: 'normal'
        });
    }

    private registerGuard() {
        this._sidebarService.registerCloseGuard(RoosterKwtInschrijvenComponent, () => this.canDeactivate(), [
            'backdrop-click',
            'escape-key',
            'page-back'
        ]);
    }

    public schrijfInVoorKWT() {
        const kwtInfo = this.roosterItem().afspraakItem.kwtInfo;
        const roosterItemJaarWeek = getJaarWeek(this.roosterItem().beginDatumTijd);
        const inschrijfActie = this.actieGeselecteerd();
        if (kwtInfo && inschrijfActie) {
            this.setLoading(true);
            this._roosterService.voerKwtActieUit(kwtInfo, inschrijfActie, roosterItemJaarWeek);
        }
    }

    public setLoading(loading: boolean) {
        this.loading.set(loading);
        this._sidebarService.closingBlocked = loading;
    }

    public canDeactivate(): Observable<boolean> {
        if (!this.actieGeselecteerd() || this.actieGeselecteerd()?.ingeschreven) {
            return of(true);
        }
        return this._harmonyModalService
            .confirmModal(
                {
                    text: "Je hebt een moment gekozen, maar bent nog niet ingeschreven. Voltooi je inschrijving door 'Inschrijven' te kiezen.",
                    annulerenButtonText: 'Niet inschrijven',
                    bevestigenButtonText: 'Inschrijven',
                    bevestigenButtonMode: 'primary'
                },
                createModalSettings({
                    title: 'Je inschrijving is nog niet voltooid',
                    widthModal: '460px',
                    titleIcon: this._deviceService.isPhoneOrTabletPortrait() ? undefined : 'waarschuwing',
                    titleIconColor: 'fg-negative-normal',
                    cdkTrapFocusAutoCapture: this._accessibilityService.isAccessedByKeyboard()
                })
            )
            .confirmResult.pipe(
                takeUntilDestroyed(this._destroyRef),
                map((result) => {
                    switch (result) {
                        case 'Positive':
                            this.schrijfInVoorKWT();
                            return true;
                        case 'Negative':
                            this.sluiten();
                            return true;
                        case 'Closed':
                            return false;
                    }
                })
            );
    }

    ngOnDestroy(): void {
        this.onDestroy$.next();
        this.onDestroy$.complete();
    }
}
