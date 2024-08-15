import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Injector,
    OnDestroy,
    OnInit,
    Signal,
    TemplateRef,
    ViewContainerRef,
    WritableSignal,
    computed,
    inject,
    input,
    output,
    signal,
    viewChild
} from '@angular/core';
import { Actions, ofActionSuccessful } from '@ngxs/store';
import { format } from 'date-fns';
import {
    ButtonComponent,
    DeviceService,
    ErrorBarComponent,
    ModalService as HarmonyModalService,
    IconDirective,
    IconPillComponent,
    PillComponent,
    PillTagColor,
    SpinnerComponent,
    StripHTMLPipe,
    TabInput,
    TabRowComponent,
    TagComponent,
    VakIconComponent,
    isPresent
} from 'harmony';
import { IconBijlage, IconChevronOnder, IconPijlLinks, IconSluiten, IconWaarschuwing, provideIcons } from 'harmony-icons';
import { AppStatusService } from 'leerling-app-status';
import { AuthenticationService, SsoService } from 'leerling-authentication';
import { HtmlContentComponent } from 'leerling-base';
import { StudiemateriaalComponent, StudiemateriaalVakselectieComponent } from 'leerling-studiemateriaal';
import { StudiewijzerItemComponent } from 'leerling-studiewijzer-api';
import {
    FULL_SCREEN_MET_MARGIN,
    InfoMessageService,
    ModalService,
    ModalSettings,
    SidebarService,
    SidebarSettings,
    SlDatePipe,
    ToHuiswerkTypenPipe,
    createModalSettings,
    createSidebarSettings,
    formatDateNL
} from 'leerling-util';
import { KwtActieUitvoerenReady, SBijlage, SStudiewijzerItem } from 'leerling/store';
import { isEqual } from 'lodash-es';
import { derivedAsync } from 'ngxtension/derived-async';
import { Subject, filter, takeUntil } from 'rxjs';
import { RoosterItem } from '../../services/rooster-model';
import { RoosterService } from '../../services/rooster.service';
import { KwtUitschrijvenConfirmModalComponent } from '../kwt-uitschrijven-confirm-modal/kwt-uitschrijven-confirm-modal.component';
import { MedewerkerAanhefAriaLabelPipe } from './medewerker-aanhef-aria-label.pipe';

const MODUS = ['Omschrijving', 'Studiemateriaal'] as const;
const TABS: TabInput[] = MODUS.map((label) => ({ label }));
type Modus = (typeof MODUS)[number];

@Component({
    selector: 'sl-rooster-item-detail',
    standalone: true,
    imports: [
        CommonModule,
        IconDirective,
        HtmlContentComponent,
        PillComponent,
        TagComponent,
        StripHTMLPipe,
        StudiewijzerItemComponent,
        ToHuiswerkTypenPipe,
        MedewerkerAanhefAriaLabelPipe,
        VakIconComponent,
        ButtonComponent,
        ErrorBarComponent,
        SpinnerComponent,
        KwtUitschrijvenConfirmModalComponent,
        TabRowComponent,
        StudiemateriaalComponent,
        StudiemateriaalVakselectieComponent,
        IconPillComponent
    ],
    templateUrl: './rooster-item-detail.component.html',
    styleUrl: './rooster-item-detail.component.scss',
    providers: [provideIcons(IconSluiten, IconBijlage, IconPijlLinks, IconWaarschuwing, IconChevronOnder)],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterItemDetailComponent implements OnInit, OnDestroy {
    public confirmModalComponentTemplate = viewChild.required('guard', { read: TemplateRef });

    private _authenticationService = inject(AuthenticationService);
    private _sidebarService = inject(SidebarService);
    private _modalService = inject(ModalService);
    private _deviceService = inject(DeviceService);
    private _harmonyModalService = inject(HarmonyModalService);
    public viewContainerRef = inject(ViewContainerRef);
    private _roosterService = inject(RoosterService);
    private _infoMessageService = inject(InfoMessageService);
    private _ssoService = inject(SsoService);
    private _elementRef = inject(ElementRef);
    private _aanhefPipe = new MedewerkerAanhefAriaLabelPipe();

    private _datePipe = new SlDatePipe();

    public loading = signal(false);
    public kwtFoutmelding: WritableSignal<string | undefined> = signal(undefined);

    private onDestroy$ = new Subject<void>();
    private actions$ = inject(Actions);
    private injector = inject(Injector);

    private herhaalDatums: Signal<Date[]>;
    public isOnline = inject(AppStatusService).isOnlineSignal();

    public roosterItem = input.required<RoosterItem>();

    public medewerkers = computed(() => this.roosterItem().afspraakItem.medewerkers.slice(0, 10));
    public meerMedewerkers = computed(() =>
        this.roosterItem().afspraakItem.medewerkers.slice(10, this.roosterItem().afspraakItem.medewerkers.length)
    );
    public toonMeerMedewerkers = signal(false);
    public medewerkerAriaLabel = computed(() => {
        const medewerkers = this.toonMeerMedewerkers() ? [...this.medewerkers(), ...this.meerMedewerkers()] : this.medewerkers();
        return medewerkers.map((medewerker) => this._aanhefPipe.transform(medewerker)).join(', ');
    });

    public huiswerkItemSelected = output<SStudiewijzerItem>();
    public openStudiemateriaal = output<void>();
    public vakMetUuid = computed(() => {
        const vak = this.roosterItem().afspraakItem.vak;
        return vak?.uuid ? vak : undefined;
    });

    private _heeftStudiemateriaal = computed(() => this.roosterItem().isLes || this.roosterItem().isToets || this.roosterItem().isKWT);
    public toonStudiemateriaalBtn = computed(
        () => this._heeftStudiemateriaal() && !this._elementRef.nativeElement.classList.contains('in-sidebar')
    );
    public toonStudiemateriaalTabs = computed(
        () => this._heeftStudiemateriaal() && this._elementRef.nativeElement.classList.contains('in-sidebar')
    );

    public lesstofItems = computed(() => this.roosterItem().studiewijzerItems?.filter((item) => item.huiswerkType === 'LESSTOF'));
    public studiewijzerItems = computed(() => this.roosterItem().studiewijzerItems?.filter((item) => item.huiswerkType !== 'LESSTOF'));
    public heeftStudiewijzerItems = computed(() => this.studiewijzerItems().length > 0);

    private herhalendeAfspraak = computed(() => this.roosterItem().afspraakItem.herhalendeAfspraak);
    public pillColor = input<PillTagColor>('primary');
    public isOuderVerzorger = this._authenticationService.isCurrentContextOuderVerzorger;

    public isPopupOpen = signal(false);
    public isGuardOpen = signal(false);
    public shouldCloseAfterConfirm = signal(false);
    public magUitschrijven = computed(
        () =>
            this.roosterItem().afspraakItem.kwtInfo?.inschrijfStatus != 'DEFINITIEF' &&
            this.roosterItem().kwtInfo?.status === 'Ingeschreven'
    );

    public tijd = computed(
        () => `${format(this.roosterItem().beginDatumTijd, 'HH:mm')} - ${format(this.roosterItem().eindDatumTijd, 'HH:mm')}`
    );

    public pillText = computed(() => {
        const info = this.roosterItem().isToets ? 'Toets' : this.roosterItem().lestijd;
        const tijd = this._datePipe.transform(this.roosterItem().beginDatumTijd, 'tijd_zonder_voorloop');

        if (isEqual(info, tijd)) {
            return tijd;
        }
        return `<span class="opacity-80">${info}</span> <span>${tijd}</span>`;
    });

    public lesurenLabel = computed(
        () =>
            (this.roosterItem().isToets ? 'Toets, ' : '') +
            RoosterService.formatBeginEindLesuurForAriaLabel(this.roosterItem().afspraakItem) +
            ', ' +
            format(this.roosterItem().afspraakItem.beginDatumTijd, 'H:mm')
    );

    public modus = signal('Omschrijving' as Modus);
    public tabs = TABS;

    ngOnInit() {
        this.actions$
            .pipe(ofActionSuccessful(KwtActieUitvoerenReady), takeUntil(this.onDestroy$))
            .subscribe((action) => this.onKwtUitvoerenReady(action.foutmelding));
    }

    private onKwtUitvoerenReady(foutmelding?: string) {
        this.setLoading(false);
        this.kwtFoutmelding.set(foutmelding);

        if (!foutmelding) {
            this.sluiten();
            this._infoMessageService.dispatchSuccessMessage('Uitschrijven is gelukt!');
            this.isGuardOpen.set(false);
            this.shouldCloseAfterConfirm.set(true);
        }
    }

    public openBijlage(bijlage: SBijlage) {
        this._ssoService.openExternalLink(bijlage.fileUrl);
    }

    public openKWTGuard() {
        if (this.herhalendeAfspraak()) {
            this.getHerhalendeAfspraakInfo();
        }
        this.isGuardOpen.set(true);
        this._harmonyModalService.modal({
            template: this.confirmModalComponentTemplate(),
            settings: {
                title: 'Weet je het zeker?',
                widthModal: '460px',
                titleIcon: this._deviceService.isPhoneOrTabletPortrait() ? undefined : 'waarschuwing',
                titleIconColor: 'fg-negative-normal'
            }
        });
    }

    public schrijfUitVoorKWT() {
        const kwtInfo = this.roosterItem().afspraakItem.kwtInfo;
        const uitschrijfActie = this.roosterItem().kwtInfo?.uitschrijfActie;
        if (kwtInfo && uitschrijfActie) {
            this.setLoading(true);
            this._roosterService.voerKwtActieUit(kwtInfo, uitschrijfActie);
        }
    }

    private getHerhalendeAfspraakInfo() {
        this.herhaalDatums = derivedAsync(
            () =>
                this._roosterService
                    .getAfspraakHerhalingInfo(this.roosterItem().kwtInfo?.uitschrijfActie?.uitvoerbareActie)
                    .pipe(filter(isPresent)),
            {
                injector: this.injector,
                initialValue: []
            }
        );
    }

    public getkwtGuardSubtext(): string {
        const enkeleAfspraak = this.formatAfspraakDate(this.roosterItem().beginDatumTijd);
        if (!this.herhalendeAfspraak()) return enkeleAfspraak;

        let subtext = '';
        this.herhaalDatums().forEach((date) => (subtext += this.formatAfspraakDate(date)));
        return subtext;
    }

    public formatAfspraakDate(datum: Date): string {
        const afspraakTijd = `${formatDateNL(this.roosterItem().beginDatumTijd, 'tijd')}-${formatDateNL(this.roosterItem().eindDatumTijd, 'tijd')}`;
        return `${formatDateNL(datum, 'dag_uitgeschreven_dagnummer_maand')}, ${afspraakTijd} <br />`;
    }

    public resetFoutmelding() {
        this.kwtFoutmelding.set(undefined);
        this.modalSluiten();
    }

    public modalSluiten() {
        this._modalService.animateAndClose();
    }

    public sluiten() {
        if (this.loading()) return;
        this._sidebarService.animateAndClose();
    }

    public setLoading(loading: boolean) {
        this.loading.set(loading);
        if (loading) {
            this._modalService.setClosingBlocked(true);
            this._sidebarService.closingBlocked = true;
            this._harmonyModalService.setClosingBlocked(true);
        } else {
            this._modalService.setClosingBlocked(false);
            this._sidebarService.closingBlocked = false;
            this._harmonyModalService.setClosingBlocked(false);
        }
    }

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getSidebarSettings(omschrijving: string): SidebarSettings {
        return createSidebarSettings({
            title: omschrijving,
            headerType: 'none'
        });
    }

    ngOnDestroy(): void {
        this.onDestroy$.next();
        this.onDestroy$.complete();
    }

    public onTabSwitch(tab: string) {
        this.modus.set(tab as Modus);
    }
}
