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
    PillComponent,
    PillTagColor,
    SpinnerComponent,
    StripHTMLPipe,
    TabInput,
    TabRowComponent,
    TagComponent,
    VakIconComponent,
    createModalSettings as createHarmonyModalSettings,
    isPresent
} from 'harmony';
import { IconBijlage, IconPijlLinks, IconSluiten, IconWaarschuwing, provideIcons } from 'harmony-icons';
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
import { StudiewijzerItemDetailComponent } from 'leerling/studiewijzer';
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
        StudiemateriaalVakselectieComponent
    ],
    templateUrl: './rooster-item-detail.component.html',
    styleUrl: './rooster-item-detail.component.scss',
    providers: [provideIcons(IconSluiten, IconBijlage, IconPijlLinks, IconWaarschuwing)],
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

    private _datePipe = new SlDatePipe();

    public loading = signal(false);
    public kwtFoutmelding: WritableSignal<string | undefined> = signal(undefined);

    private onDestroy$ = new Subject<void>();
    private actions$ = inject(Actions);
    private injector = inject(Injector);

    private herhaalDatums: Signal<Date[]>;
    public isOnline = inject(AppStatusService).isOnlineSignal();

    public roosterItem = input.required<RoosterItem>();
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

    public lesurenLabel = computed(() => RoosterService.formatBeginEindLesuurForAriaLabel(this.roosterItem().afspraakItem));

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

    public openHuiswerk(huiswerk: SStudiewijzerItem) {
        this._sidebarService.push(
            StudiewijzerItemDetailComponent,
            computed(() => ({
                item: this.roosterItem().studiewijzerItems.find((swi) => swi.id === huiswerk.id) ?? huiswerk
            })),
            StudiewijzerItemDetailComponent.getSidebarSettings(huiswerk, () => this.reopenModal())
        );
        this.modalSluiten();
    }

    public openKWTGuard() {
        if (this.herhalendeAfspraak()) {
            this.getHerhalendeAfspraakInfo();
        }
        this.isGuardOpen.set(true);
        this._harmonyModalService.modal(
            this.confirmModalComponentTemplate(),
            undefined,
            createHarmonyModalSettings({
                title: 'Weet je het zeker?',
                widthModal: '460px',
                titleIcon: this._deviceService.isPhoneOrTabletPortrait() ? undefined : 'waarschuwing',
                titleIconColor: 'fg-negative-normal'
            })
        ) as KwtUitschrijvenConfirmModalComponent;
    }

    public schrijfUitVoorKWT() {
        const kwtInfo = this.roosterItem().afspraakItem.kwtInfo;
        const uitschrijfActie = this.roosterItem().kwtInfo?.uitschrijfActie;
        if (kwtInfo && uitschrijfActie) {
            this.setLoading(true);
            this._roosterService.voerKwtActieUit(kwtInfo, uitschrijfActie);
        }
    }

    private reopenModal() {
        if (this._deviceService.isPhoneOrTabletPortrait()) {
            this._modalService.modal(
                RoosterItemDetailComponent,
                {
                    roosterItem: this.roosterItem(),
                    pillColor: this.pillColor()
                },
                RoosterItemDetailComponent.getModalSettings()
            );
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

    public openStudiemateriaal() {
        const vak = this.roosterItem().afspraakItem.vak;
        if (vak) {
            this._sidebarService.push(
                StudiemateriaalComponent,
                {
                    vak: vak,
                    lesgroep: undefined,
                    toonAlgemeneLeermiddelen: true
                },
                StudiemateriaalComponent.getSidebarSettings(vak, () => this.reopenModal())
            );
        } else {
            this._sidebarService.push(
                StudiemateriaalVakselectieComponent,
                {},
                StudiemateriaalVakselectieComponent.getSidebarSettings(() => this.reopenModal())
            );
        }
        this.modalSluiten();
    }

    public onTabSwitch(tab: string) {
        this.modus.set(tab as Modus);
    }
}
