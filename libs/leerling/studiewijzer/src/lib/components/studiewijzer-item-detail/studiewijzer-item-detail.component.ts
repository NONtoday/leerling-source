import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ButtonComponent, DeviceService, IconDirective, SpinnerComponent, TabInput, TabRowComponent, VakIconComponent } from 'harmony';
import { IconBoek, IconPijlLinks, IconSluiten, provideIcons } from 'harmony-icons';
import { AuthenticationService } from 'leerling-authentication';
import { StudiemateriaalComponent, StudiemateriaalVakselectieComponent } from 'leerling-studiemateriaal';
import {
    StudiewijzerItemInleveringenComponent,
    StudiewijzerItemInstructieComponent,
    getVakOfLesgroepNaam
} from 'leerling-studiewijzer-api';
import {
    FULL_SCREEN_MET_MARGIN,
    ModalSettings,
    SidebarCloseTrigger,
    SidebarService,
    SidebarSettings,
    Tabbable,
    createModalSettings,
    createSidebarSettings
} from 'leerling-util';
import { InleveropdrachtService, SStudiewijzerItem } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { Observable, of, switchMap } from 'rxjs';
import { ReactiesComponent } from '../inleveropdracht/reacties/reacties.component';

const MODUS = ['Instructie', 'Inleveren', 'Reacties'] as const;
const TABS: TabInput[] = MODUS.map((label) => ({ label }));
export type Modus = (typeof MODUS)[number];

@Component({
    selector: 'sl-studiewijzer-item-detail',
    imports: [
        CommonModule,
        StudiewijzerItemInstructieComponent,
        StudiewijzerItemInleveringenComponent,
        TabRowComponent,
        VakIconComponent,
        IconDirective,
        ButtonComponent,
        SpinnerComponent,
        ReactiesComponent
    ],
    providers: [provideIcons(IconSluiten, IconBoek, IconPijlLinks)],
    templateUrl: './studiewijzer-item-detail.component.html',
    styleUrl: './studiewijzer-item-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerItemDetailComponent implements AfterViewInit, Tabbable {
    tabRowComponent = viewChild(TabRowComponent);

    private _sidebarService = inject(SidebarService);
    private _deviceService = inject(DeviceService);
    private _authenticationService = inject(AuthenticationService);
    private _inleveropdrachtService = inject(InleveropdrachtService);

    private _inleverenComponent = viewChild(StudiewijzerItemInleveringenComponent);
    private _reactiesComponent = viewChild(ReactiesComponent);
    private _deactivatableComponents = computed(() => ({
        inleverenComponent: this._inleverenComponent(),
        reactiesComponent: this._reactiesComponent()
    }));

    public canDeactivate$ = toObservable(this._deactivatableComponents).pipe(
        switchMap(
            (components) => components.inleverenComponent?.canDeactivate() ?? components.reactiesComponent?.canDeactivate() ?? of(true)
        )
    );

    private initialModus: Modus | undefined = undefined;

    public isTabletOrDesktop = this._deviceService.isTabletOrDesktopSignal;

    public item = input.required<SStudiewijzerItem>();

    public toonInleverenKnop = computed(
        () => this._authenticationService.isCurrentContextLeerling && this._inleveropdrachtService.magInleveren(this.item())
    );

    private _tabRowComponent = viewChild(TabRowComponent);

    public inleverDetails = derivedAsync(() =>
        this.item().isInleveropdracht && this._authenticationService.isCurrentContextLeerling
            ? this._inleveropdrachtService.getInleverDetails(this.item().toekenningId, this.item().datumTijd)
            : undefined
    );

    public showBackButton = input<boolean>(false);

    public titel = computed(() => getVakOfLesgroepNaam(this.item()) ?? '');
    public vak = computed(() => this.item().vak?.naam);

    public modus = signal('Instructie' as Modus);
    public tabs = computed(() =>
        this.item().isInleveropdracht && this._authenticationService.isCurrentContextLeerling ? TABS : undefined
    );

    private _isBackTabSwitch = false;

    private _tabStack: Modus[] = [];

    canGoTabBack(): boolean {
        return this._tabStack.length > 1;
    }
    tabBack(): void {
        // De bovenste op de stapel is het huidige tab, het tabje daaronder moet je hebben.
        this._tabStack.pop();
        const lastModus = this._tabStack.pop();
        if (lastModus) {
            this.tabRowComponent()?.setActiveTab(lastModus);
        }
    }

    public onTabSwitch(tab: string) {
        const modus = tab as Modus;
        this._tabStack.push(modus);
        this.modus.set(modus);
    }

    public naarInleveren() {
        this._tabRowComponent()?.setActiveTab('Inleveren');
    }

    ngAfterViewInit(): void {
        if (!this.tabs()) return;

        if (this.tabs() && this.initialModus) {
            this.tabRowComponent()?.setActiveTab(this.initialModus);
        } else {
            this._tabStack.push('Instructie');
        }
    }

    public setInitialModus(modus: Modus) {
        this.initialModus = modus;
    }

    public openStudiemateriaal() {
        StudiewijzerItemDetailComponent.openStudiemateriaal(this.item(), this._sidebarService);
    }

    public terug() {
        this._sidebarService.backWithAnimation();
    }

    public close() {
        this._sidebarService.animateAndClose();
    }

    public canDeactivate(): Observable<boolean> | undefined {
        return this._inleverenComponent()?.canDeactivate() ?? this._reactiesComponent()?.canDeactivate();
    }

    verstuurReactie(inhoud: string) {
        this._inleveropdrachtService.verstuurReactie(this.item().toekenningId, this.item().datumTijd, inhoud);
    }

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getSidebarSettings(
        huiswerk: SStudiewijzerItem,
        sidebarService: SidebarService,
        hasBookmarkableUrl: boolean,
        onClose?: (trigger: SidebarCloseTrigger) => void
    ): SidebarSettings {
        return createSidebarSettings({
            title: getVakOfLesgroepNaam(huiswerk) ?? '',
            headerDevice: 'mobilePortrait',
            headerType: huiswerk.isInleveropdracht ? 'borderless' : 'normal',
            iconsRight: [
                {
                    name: 'boek',
                    onClick: () => StudiewijzerItemDetailComponent.openStudiemateriaal(huiswerk, sidebarService)
                }
            ],
            hasBookmarkableUrl: hasBookmarkableUrl,
            onClose
        });
    }

    public static openStudiemateriaal(item: SStudiewijzerItem, sidebarService: SidebarService) {
        const canDeactivate = sidebarService.getSidebarComponent(StudiewijzerItemDetailComponent)?.canDeactivate();
        if (canDeactivate) {
            canDeactivate.subscribe((canDeactivate) => {
                if (canDeactivate) StudiewijzerItemDetailComponent.pushStudiemateriaal(item, sidebarService);
            });
        } else {
            StudiewijzerItemDetailComponent.pushStudiemateriaal(item, sidebarService);
        }
    }

    private static pushStudiemateriaal(item: SStudiewijzerItem, sidebarService: SidebarService) {
        const vak = item.vak;
        if (vak) {
            sidebarService.push(
                StudiemateriaalComponent,
                {
                    vak: vak,
                    lesgroep: undefined,
                    toonAlgemeneLeermiddelen: true
                },
                StudiemateriaalComponent.getSidebarSettings(vak)
            );
        } else {
            sidebarService.push(StudiemateriaalVakselectieComponent, {}, StudiemateriaalVakselectieComponent.getSidebarSettings());
        }
    }
}
