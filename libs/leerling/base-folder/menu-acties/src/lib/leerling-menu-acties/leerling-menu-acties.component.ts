import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AvatarComponent, IconDirective, OverlayService } from 'harmony';
import { IconHelp, IconKalenderToevoegen, IconLijst, IconLink, IconSchool, IconSettings, IconUitloggen, provideIcons } from 'harmony-icons';
import { AccountModalComponent } from 'leerling-account-modal';
import { AppStatusService } from 'leerling-app-status';
import { REGISTRATIES } from 'leerling-base';
import { StudiemateriaalVakselectieComponent } from 'leerling-studiemateriaal';
import { createModalSettings, FULL_SCREEN_MET_MARGIN, ModalService as LeerlingModalService, SidebarService } from 'leerling-util';
import { HeeftRechtDirective } from 'leerling/store';
import { SchoolinformatieModalComponent } from '../schoolinformatie-modal/schoolinformatie-modal.component';

export const SUPPORT_URL_VERZORGER = 'https://somtoday-servicedesk.zendesk.com/hc/nl/sections/360002813877-Ouders-en-verzorgers';
export const SUPPORT_URL_LEERLING = 'https://somtoday-servicedesk.zendesk.com/hc/nl/sections/360004489338-Leerlingen';

@Component({
    selector: 'sl-leerling-menu-acties',
    standalone: true,
    templateUrl: './leerling-menu-acties.component.html',
    styleUrl: './leerling-menu-acties.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, IconDirective, A11yModule, AvatarComponent, HeeftRechtDirective],
    providers: [provideIcons(IconSettings, IconSchool, IconKalenderToevoegen, IconLijst, IconUitloggen, IconHelp, IconLink)]
})
export class LeerlingMenuActiesComponent {
    private _overlayService = inject(OverlayService);
    private _modalService = inject(LeerlingModalService);
    private _sidebarService = inject(SidebarService);
    private _router = inject(Router);
    private _supportLink = viewChild.required('supportLink', { read: ElementRef });

    isOnline = inject(AppStatusService).isOnlineSignal();

    leerling = input.required<{
        naam: string | undefined;
        initialen: string | undefined;
        organisatienaam: string | undefined;
        avatarSrc: string | undefined;
    }>();
    isVerzorger = input.required<boolean>();

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

    studiemateriaal() {
        this._overlayService.closeAll();
        this._sidebarService.push(StudiemateriaalVakselectieComponent, {}, StudiemateriaalVakselectieComponent.getSidebarSettings());
    }

    registraties() {
        this._router.navigate([REGISTRATIES]);
        this._overlayService.closeAll();
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
