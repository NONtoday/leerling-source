import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AvatarComponent, IconDirective, OverlayService } from 'harmony';
import {
    IconHelp,
    IconKalenderToevoegen,
    IconLink,
    IconPersoonKruisBlock,
    IconSchool,
    IconSettings,
    IconUitloggen,
    provideIcons
} from 'harmony-icons';
import { AccountModalComponent, WeergaveService } from 'leerling-account-modal';
import { AppStatusService } from 'leerling-app-status';
import { AFWEZIGHEID } from 'leerling-base';
import { StudiemateriaalVakselectieComponent } from 'leerling-studiemateriaal';
import {
    AccessibilityService,
    createModalSettings,
    FULL_SCREEN_MET_MARGIN,
    ModalService as LeerlingModalService,
    SidebarService
} from 'leerling-util';
import { RechtenService, verifyRegistratieOverzichtRechten } from 'leerling/store';
import { map } from 'rxjs';
import { SchoolinformatieModalComponent } from '../schoolinformatie-modal/schoolinformatie-modal.component';

export const SUPPORT_URL_VERZORGER = 'https://somtoday-servicedesk.zendesk.com/hc/nl/sections/360002813877-Ouders-en-verzorgers';
export const SUPPORT_URL_LEERLING = 'https://somtoday-servicedesk.zendesk.com/hc/nl/sections/360004489338-Leerlingen';

@Component({
    selector: 'sl-leerling-menu-acties',
    templateUrl: './leerling-menu-acties.component.html',
    styleUrl: './leerling-menu-acties.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, IconDirective, A11yModule, AvatarComponent],
    providers: [provideIcons(IconSettings, IconSchool, IconKalenderToevoegen, IconPersoonKruisBlock, IconUitloggen, IconHelp, IconLink)]
})
export class LeerlingMenuActiesComponent {
    private _overlayService = inject(OverlayService);
    private _modalService = inject(LeerlingModalService);
    private _sidebarService = inject(SidebarService);
    private _router = inject(Router);
    private _rechtenService = inject(RechtenService);
    private _supportLink = viewChild.required('supportLink', { read: ElementRef });
    private _accessibilityService = inject(AccessibilityService);
    private _weergaveService = inject(WeergaveService);

    profielfotoVerbergen = this._weergaveService.profielfotoVerbergen;

    isOnline = inject(AppStatusService).isOnlineSignal();

    leerling = input.required<{
        naam: string | undefined;
        initialen: string | undefined;
        organisatienaam: string | undefined;
        avatarSrc: string | undefined;
    }>();
    isVerzorger = input.required<boolean>();

    private accountContextMetRechten$ = this._rechtenService.getAccountContextMetRechten();
    public heeftRegistratieOverzichtRechten = toSignal(
        this.accountContextMetRechten$.pipe(
            map((context) => !context.currentAccountIsVerzorger && verifyRegistratieOverzichtRechten(context))
        )
    );

    supportUrl = computed(() => (this.isVerzorger() ? SUPPORT_URL_VERZORGER : SUPPORT_URL_LEERLING));

    schoolinformatie() {
        this._overlayService.closeAll();
        this._modalService.modal(
            SchoolinformatieModalComponent,
            {},
            createModalSettings({
                contentPadding: 0,
                heightRollup: FULL_SCREEN_MET_MARGIN,
                maxHeightRollup: 'unset',
                heightModal: '75%',
                showClose: false
            })
        );
    }

    instellingen() {
        this._overlayService.closeAll();
        this._modalService.modal(
            AccountModalComponent,
            { initeleTab: undefined },
            createModalSettings({
                contentPadding: 0,
                heightRollup: FULL_SCREEN_MET_MARGIN,
                maxHeightRollup: 'unset',
                heightModal: '75%',
                showClose: false
            })
        );
    }

    studiemateriaal() {
        this._overlayService.closeAll();
        this._sidebarService.push(StudiemateriaalVakselectieComponent, {}, StudiemateriaalVakselectieComponent.getSidebarSettings());
    }

    afwezigheid() {
        this._router.navigate([AFWEZIGHEID]);
        this._overlayService.closeAll();
        this._accessibilityService.resetFocusState();
    }

    support() {
        this._overlayService.closeAll();
        this._supportLink().nativeElement.click();
    }

    uitloggen() {
        this._modalService.animateAndClose();
        this._router.navigate(['/login'], { queryParams: { logout: true } });
    }
}
