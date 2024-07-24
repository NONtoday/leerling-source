import { animate, state, style, transition, trigger } from '@angular/animations';
import { A11yModule } from '@angular/cdk/a11y';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    TemplateRef,
    ViewContainerRef,
    computed,
    inject,
    input,
    viewChild
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    AvatarComponent,
    ButtonComponent,
    IconDirective,
    OverlayService,
    SpinnerComponent,
    TooltipDirective,
    createModalSettings,
    createPopupSettings
} from 'harmony';
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
import { AppStatusService } from 'leerling-app-status';
import { TabBarComponent } from 'leerling-base';
import { LeerlingMenuActiesComponent } from 'leerling-menu-acties';
import { LeerlingSwitcherComponent } from 'leerling-menu-leerling-switcher';
import { AVATAR_TAB_INDEX, AccessibilityService, PopupOpenDirective } from 'leerling-util';
import { HeeftRechtDirective } from 'leerling/store';
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
    standalone: true,
    imports: [
        AsyncPipe,
        TabBarComponent,
        A11yModule,
        IconDirective,
        AvatarComponent,
        PopupOpenDirective,
        ButtonComponent,
        NgTemplateOutlet,
        LeerlingMenuActiesComponent,
        SpinnerComponent,
        TooltipDirective,
        LeerlingSwitcherComponent,
        HeeftRechtDirective
    ],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    host: {
        '[class.with-back-button]': 'viewModel()?.showBackButton',
        '[class.verzorger]': 'viewModel()?.isVerzorger',
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
    accessibilityService = inject(AccessibilityService);
    private _statusService = inject(AppStatusService);

    menuActiesTemplateRef = viewChild.required('menuacties', { read: TemplateRef });
    leerlingSwitcherTemplateRef = viewChild.required('leerlingswitcher', { read: TemplateRef });
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

    goToContent() {
        document.getElementById('mainContent')?.focus();
        this.accessibilityService.goToContent();
    }

    openLeerlingSettingsComponent(ref: ViewContainerRef | undefined) {
        if (!ref || this._overlayService.isOpen(ref)) return;

        this._overlayService.popupOrModal(
            this.menuActiesTemplateRef(),
            ref,
            {
                leerling: {
                    avatarSrc: this.viewModel().avatarSrc,
                    initialen: this.viewModel().initialen,
                    naam: this.viewModel().leerlingNaam,
                    organisatienaam: this.viewModel().organisatienaam
                }
            },
            createPopupSettings({ width: '280px' }),
            createModalSettings({ contentPadding: 0 })
        );
    }

    openLeerlingSwitcherComponent() {
        const avatarRef = this.avatarRef();
        if (!avatarRef || this._overlayService.isOpen(avatarRef)) return;
        this._overlayService.popupOrModal(
            this.leerlingSwitcherTemplateRef(),
            avatarRef,
            {},
            createPopupSettings({ position: 'under', alignment: 'start' }),
            createModalSettings({ title: 'Mijn accounts', contentPadding: 0, showClose: false })
        ) as LeerlingSwitcherComponent;
    }

    onBackButtonClicked() {
        this.headerService.backButtonClicked();
    }
}
