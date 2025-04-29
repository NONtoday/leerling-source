import { animate, state, style, transition, trigger } from '@angular/animations';
import { A11yModule } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    TemplateRef,
    viewChild,
    ViewContainerRef
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AvatarComponent, IconDirective, OverlayService, TooltipDirective } from 'harmony';
import {
    IconBoek,
    IconChevronOnder,
    IconFilter,
    IconHamburger,
    IconKalenderDag,
    IconKalenderToevoegen,
    IconNieuwBericht,
    IconPijlLinks,
    IconSettings,
    provideIcons
} from 'harmony-icons';
import { WeergaveService } from 'leerling-account-modal';
import { AppStatusService } from 'leerling-app-status';
import { TabBarComponent } from 'leerling-base';
import { LeerlingMenuActiesComponent } from 'leerling-menu-acties';
import { LeerlingSwitcherComponent } from 'leerling-menu-leerling-switcher';
import { AVATAR_TAB_INDEX } from 'leerling-util';

import { HeaderService } from './service/header.service';

export interface HeaderViewModel {
    showUserInfoWithAvatar: boolean;
    showTabBar: boolean;
    isVerzorger: boolean;
    leerlingNaam?: string;
    initialen?: string;
    organisatienaam?: string;
    avatarSrc?: string;
    title?: string;
    verbergLeerlingInfo?: boolean;
    showBackButton: boolean;
    showActions: boolean;
}

// Delay in animatie met 10ms en geen uit animatie om te voorkomen het horizontaal verspringt.
export const FADE_IN_OUT_ANIMATION = trigger('fadeInOut', [
    state('void', style({ opacity: 0 })),
    state('*', style({ opacity: 1 })),

    transition('void => *', animate('150ms 10ms ease-in')),
    transition('* => void', animate('50ms ease-out'))
]);

const ANIMATIONS = [FADE_IN_OUT_ANIMATION];

@Component({
    selector: 'sl-header',
    imports: [
        TabBarComponent,
        A11yModule,
        IconDirective,
        AvatarComponent,
        NgTemplateOutlet,
        LeerlingMenuActiesComponent,
        TooltipDirective,
        LeerlingSwitcherComponent
    ],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    host: {
        '[class.with-back-button]': 'viewModel()?.showBackButton',
        '[class.verzorger]': 'viewModel()?.isVerzorger',
        '[class.verberg-leerling-info]': 'viewModel()?.verbergLeerlingInfo',
        '[class.hide-border-bottom-mobile]': 'hideBorderBottomMobile()'
    },
    animations: ANIMATIONS,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        provideIcons(
            IconPijlLinks,
            IconHamburger,
            IconSettings,
            IconChevronOnder,
            IconKalenderDag,
            IconFilter,
            IconBoek,
            IconNieuwBericht,
            IconKalenderToevoegen
        )
    ]
})
export class HeaderComponent implements AfterViewInit {
    public avatarTabIndex = AVATAR_TAB_INDEX;

    public elementRef = inject(ElementRef);
    public headerService = inject(HeaderService);
    private _changeDetector = inject(ChangeDetectorRef);
    private _overlayService = inject(OverlayService);
    private _statusService = inject(AppStatusService);

    private _weergaveService = inject(WeergaveService);
    profielfotoVerbergen = this._weergaveService.profielfotoVerbergen;

    menuActiesTemplateRef = viewChild('menuacties', { read: TemplateRef });
    leerlingSwitcherTemplateRef = viewChild('leerlingswitcher', { read: TemplateRef });
    hamburgerRef = viewChild('hamburger', { read: ViewContainerRef });
    avatarRef = viewChild('avatar', { read: ViewContainerRef });
    menuAvatarRef = viewChild('menuavatar', { read: ViewContainerRef });

    hideBorderBottomMobile = input(false);

    viewModel = toSignal(this.headerService.getViewModel(), { requireSync: true });

    avatarAriaLabel = computed(() => (this.viewModel().isVerzorger ? `${this.viewModel().leerlingNaam} is geselecteerd` : ''));

    isOnline = this._statusService.isOnlineSignal();

    ngAfterViewInit() {
        this.headerService.headerRef = this;
        // Na het initialiseren een detectChanges zodat de PopupOpen-directive gevuld wordt met de avatarRef die hierna pas beschikbaar is.
        this._changeDetector.detectChanges();
    }

    verzorgerHamburgerClick() {
        // handle click af de parent
        if (!this.viewModel().isVerzorger) return;
        this.openLeerlingSettingsComponent(this.hamburgerRef());
    }

    leerlingMenuAvatarClick() {
        if (this.viewModel().isVerzorger) return;
        this.openLeerlingSettingsComponent(this.menuAvatarRef());
    }

    verzorgerAvatarClick() {
        if (!this.viewModel().isVerzorger || !this.isOnline().valueOf()) return;

        this.openLeerlingSwitcherComponent();
    }

    openLeerlingSettingsComponent(ref: ViewContainerRef | undefined) {
        const settingsTemplate = this.menuActiesTemplateRef();
        if (!settingsTemplate || !ref || this._overlayService.isOpen(ref)) return;

        this._overlayService.popupOrModal({
            template: settingsTemplate,
            element: ref,
            popupSettings: { width: '280px', preventScrollElementInViewport: true },
            modalSettings: { contentPadding: 0 }
        });
    }

    openLeerlingSwitcherComponent() {
        const avatarRef = this.avatarRef();
        const switcherTemplate = this.leerlingSwitcherTemplateRef();
        if (!avatarRef || !switcherTemplate || this._overlayService.isOpen(avatarRef)) return;
        this._overlayService.popupOrModal({
            template: switcherTemplate,
            element: avatarRef,
            popupSettings: { position: 'under', alignment: 'start', preventScrollElementInViewport: true },
            modalSettings: { title: 'Mijn accounts', contentPadding: 0, showClose: false }
        });
    }

    onBackButtonClicked() {
        this.headerService.backButtonClicked();
    }
}
