import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, Renderer2, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AutoFocusDirective, BgColorToken, CssVarPipe, DeviceService, IconDirective, OnColorToken, shareReplayLastValue } from 'harmony';
import {
    IconKalenderDag,
    IconName,
    IconNotificatie,
    IconPersoon,
    IconPersoonCheck,
    IconSluiten,
    IconUitloggen,
    IconVoorkeur,
    IconWeergave,
    provideIcons
} from 'harmony-icons';
import { AppStatusService } from 'leerling-app-status';
import { Affiliation, AuthenticationService } from 'leerling-authentication';
import { DeploymentConfiguration, environment } from 'leerling-environment';
import {
    AccessibilityService,
    ISwipable,
    ModalComponent,
    ModalScrollableElementsProvider,
    ModalService,
    SwipeInfo,
    SwipeManager
} from 'leerling-util';
import { AccountRecht, HeeftRechtDirective, RechtenService } from 'leerling/store';
import { BehaviorSubject, Observable, combineLatest, map, take, tap } from 'rxjs';
import { match } from 'ts-pattern';
import { AccountModalDetailsComponent } from '../account-modal-details/account-modal-details.component';
import { AccountModalHeaderComponent, HeaderAction } from '../account-modal-header/account-modal-header.component';
import { AccountModalTabComponent } from '../account-modal-tab/account-modal-tab.component';
import { AgendaComponent } from '../agenda/agenda.component';
import { GegevensComponent } from '../gegevens/gegevens.component';
import { NotificatieSettingsComponent } from '../voorkeuren/notificatie-settings/notificatie-settings.component';
import { ToestemmingenService } from '../voorkeuren/toestemmingen/service/toestemmingen.service';
import { ToestemmingenComponent } from '../voorkeuren/toestemmingen/toestemmingen.component';
import { WeergaveComponent } from '../weergave/weergave.component';

@Component({
    selector: 'sl-account-modal',
    standalone: true,
    imports: [
        CommonModule,
        ModalComponent,
        AccountModalHeaderComponent,
        AccountModalTabComponent,
        AccountModalDetailsComponent,
        IconDirective,
        CssVarPipe,
        GegevensComponent,
        WeergaveComponent,
        AgendaComponent,
        HeeftRechtDirective,
        A11yModule,
        ToestemmingenComponent,
        NotificatieSettingsComponent,
        AutoFocusDirective
    ],
    templateUrl: './account-modal.component.html',
    styleUrls: ['./account-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        provideIcons(
            IconUitloggen,
            IconSluiten,
            IconPersoon,
            IconVoorkeur,
            IconWeergave,
            IconKalenderDag,
            IconNotificatie,
            IconPersoonCheck
        )
    ]
})
export class AccountModalComponent implements OnInit, ISwipable, ModalScrollableElementsProvider {
    @ViewChild(GegevensComponent, { static: false }) gegevensComponent: GegevensComponent;
    @ViewChild(AccountModalDetailsComponent, { static: true }) accountModalDetailsComponent: AccountModalDetailsComponent;
    @ViewChild('menu', { read: ElementRef }) accountMenuRef: ElementRef;
    @ViewChild('container', { read: ElementRef, static: false }) containerRef: ElementRef;

    private _modalService = inject(ModalService);
    private _appStatus = inject(AppStatusService);
    private _deviceService = inject(DeviceService);
    private _authenticationService = inject(AuthenticationService);
    private _toestemmingService = inject(ToestemmingenService);
    private _renderer = inject(Renderer2);
    private _rechtenService = inject(RechtenService);
    private _accessibilityService: AccessibilityService = inject(AccessibilityService);
    private _destroyRef = inject(DestroyRef);
    private _swipeManager = new SwipeManager(this);

    public tabs$: Observable<AccountModalTab[]>;
    public selectedTab = signal<AccountModalTabTitel | undefined>(undefined);
    public version$: Observable<string>;
    public isOnline = this._appStatus.isOnlineSignal();

    private _scrollElement = new BehaviorSubject<ElementRef[]>([]);

    public isCurrentContextOuderVerzorger = this._authenticationService.isCurrentContextOuderVerzorger;
    public toestemmingen = toSignal(this._toestemmingService.getToestemmingen(), { initialValue: [] });

    ngOnInit() {
        this.tabs$ = combineLatest([
            this._appStatus.isOnline(),
            this._authenticationService.currentAffiliation$,
            this._toestemmingService.getToestemmingen()
        ]).pipe(
            tap(([isOnline]) => {
                if (!isOnline) this.selectedTab.set('Weergave');
            }),
            map(([isOnline, affiliation, toestemmingen]) => {
                const heeftToestemmingen =
                    toestemmingen.length > 0 &&
                    toestemmingen.some(
                        (toestemming) => (toestemming.toestemmingen?.length ?? 0) > 0 || (toestemming.portaalToestemmingen?.length ?? 0) > 0
                    );
                return (
                    tabs
                        // filter ouder tabs bij ouders
                        .filter((tab) => (affiliation === Affiliation.PARENT_GUARDIAN ? !DISABLED_OUDER_TABS.includes(tab.titel) : true))
                        // filter toestemmingen tab bij geen toestemmingen
                        .filter((tab) => (tab.titel === 'Toestemmingen' && !heeftToestemmingen ? false : true))
                        // filter offline tabs
                        .filter((tab) => (isOnline ? true : tab.offlineAvailable))
                );
            }),
            shareReplayLastValue()
        );

        if (this._deviceService.isTabletOrDesktop()) {
            combineLatest([this.tabs$, this._rechtenService.getCurrentAccountRechten()])
                .pipe(take(1))
                .subscribe(([tabs, rechten]) => {
                    if (!this.selectedTab()) {
                        const foundTab = tabs.find((tab) =>
                            rechten?.profielBekijkenAan ? tab.titel === 'Mijn gegevens' : tab.titel === 'Weergave'
                        );
                        if (foundTab) {
                            this.selectTab(foundTab, false);
                        }
                    }
                });
        }
        this.version$ = this._appStatus.getVersion$();

        setTimeout(() => {
            this._scrollElement.next([this.accountMenuRef, this.accountModalDetailsComponent.contentRef]);
        });
    }

    selectTab(item: AccountModalTab | undefined, focusOnDetails = true) {
        this.selectedTab.set(item?.titel);
        this.accountModalDetailsComponent.contentRef.nativeElement.scrollTop = 0;
        if (focusOnDetails) {
            this.setFocusOnDetailsTitle();
        }
    }

    setHeaderTitleWithFocus(title: string) {
        this.accountModalDetailsComponent.setTitle(title);
        this.setFocusOnDetailsTitle();
    }

    setFocusOnDetailsTitle() {
        setTimeout(() => {
            if (this._accessibilityService.isAccessedByKeyboard()) {
                this.accountModalDetailsComponent.accountModalHeader?.titleRef?.nativeElement.focus();
            }
        }, 250); // wacht animatie af, anders is die janky
    }

    forceUitloggen() {
        if (DeploymentConfiguration.productie === environment.iridiumConfig) {
            return;
        }
        this._modalService.animateAndClose();
        this._authenticationService.logoffAndRemove(true);
    }

    onHeaderActionClicked(action: HeaderAction) {
        match(action)
            .with('sluiten', () => this._modalService.animateAndClose())
            .with('terug', () => {
                if (this.gegevensComponent?.onHeaderTerug()) {
                    return;
                }
                this.showMenu();
            })
            .exhaustive();
    }

    onTouchStart(evt: TouchEvent) {
        if (this._deviceService.isTabletOrDesktop()) return;
        this._swipeManager.onTouchStart(evt);
        this._renderer.setStyle(this.accountMenuRef.nativeElement, 'transform', `translateX(0%)`);
    }

    onTouchMove(evt: TouchEvent) {
        if (this._deviceService.isTabletOrDesktop()) return;
        this._swipeManager.onTouchMove(evt);
    }

    onTouchEnd(evt: TouchEvent) {
        if (this._deviceService.isTabletOrDesktop()) return;
        this._swipeManager.onTouchEnd(evt);
    }

    onSuccessfullSwipe(): void {
        this.showMenu();
    }

    onSwiping(): void {
        return;
    }

    onSwipeStart(): void {
        // Er zijn al bestaande animaties voor als iemand klikt. Die zetten we uit.
        this._renderer.setStyle(this.accountModalDetailsComponent.elementRef.nativeElement, 'transition', `none`);
        this._renderer.setStyle(this.accountMenuRef.nativeElement, 'transition', `none`);
    }

    getSwipeInfo(): SwipeInfo {
        return {
            swipableElement: this.accountModalDetailsComponent.elementRef,
            swipeDirection: ['right'],
            pixelsMovedToSuccessfullSwipe: 36
        };
    }

    onCancelSwipe(): void {
        this._renderer.setStyle(this.accountMenuRef.nativeElement, 'transform', `translateX(-10%)`);

        setTimeout(() => {
            this.addTransition();
        }, 100);
    }

    private addTransition() {
        this._renderer.removeStyle(this.accountModalDetailsComponent.elementRef.nativeElement, 'transition');
        this._renderer.removeStyle(this.accountMenuRef.nativeElement, 'transition');
    }

    private showMenu() {
        this.addTransition();

        this._renderer.setStyle(this.accountModalDetailsComponent.elementRef.nativeElement, 'transform', `translateX(100%)`);
        this._renderer.setStyle(this.accountMenuRef.nativeElement, 'transform', `translateX(0)`);

        setTimeout(() => {
            this._renderer.removeStyle(this.accountModalDetailsComponent.elementRef.nativeElement, 'transform');
            this._renderer.removeStyle(this.accountMenuRef.nativeElement, 'transform');
            this.selectTab(undefined);
        }, 250);
    }

    getScrollableElements(): Observable<ElementRef[]> {
        return this._scrollElement.pipe(takeUntilDestroyed(this._destroyRef));
    }

    isSwipeAllowed(): boolean {
        const scrollTop = this.selectedTab()
            ? this.accountModalDetailsComponent.contentRef.nativeElement.scrollTop
            : this.accountMenuRef.nativeElement.scrollTop;
        return scrollTop === 0;
    }
}

export type AccountModalTabTitel = 'Mijn gegevens' | 'Weergave' | 'Notificaties' | 'Toestemmingen' | 'Agenda';

export interface AccountModalTab {
    titel: AccountModalTabTitel;
    icon: IconName;
    fgColor: OnColorToken;
    bgColor: BgColorToken;
    recht?: AccountRecht;
    offlineAvailable?: boolean;
}

const tabs: AccountModalTab[] = [
    {
        titel: 'Mijn gegevens',
        icon: 'persoon',
        fgColor: 'fg-on-neutral-moderate',
        bgColor: 'bg-neutral-moderate',
        recht: 'profielBekijkenAan'
    },
    {
        titel: 'Weergave',
        icon: 'weergave',
        fgColor: 'fg-on-primary-weak',
        bgColor: 'bg-primary-weak',
        offlineAvailable: true
    },
    {
        titel: 'Notificaties',
        icon: 'notificatie',
        fgColor: 'fg-on-alternative-weak',
        bgColor: 'bg-alternative-weak'
    },
    {
        titel: 'Toestemmingen',
        icon: 'persoonCheck',
        fgColor: 'fg-on-accent-weak',
        bgColor: 'bg-accent-weak'
    },
    {
        titel: 'Agenda',
        icon: 'kalenderDag',
        fgColor: 'fg-on-positive-weak',
        bgColor: 'bg-positive-weak',
        recht: 'roosterBeschikbaarIcalAan'
    }
];

const DISABLED_OUDER_TABS: AccountModalTabTitel[] = ['Agenda'];
