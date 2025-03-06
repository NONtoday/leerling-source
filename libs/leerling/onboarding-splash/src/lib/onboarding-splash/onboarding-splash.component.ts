import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ButtonComponent, DeviceService, ModalService as ModalServiceHarmony, OverlayService, createModalSettings } from 'harmony';
import { AccountModalComponent } from 'leerling-account-modal';
import { FULL_SCREEN_MET_MARGIN, ModalService } from 'leerling-util';
import { derivedAsync } from 'ngxtension/derived-async';

export const ONBOARDING_LOCALSTORAGE_KEY = 'studiewijzer-had-first-login';
export const ONBOARDING_MODAL_SETTINGS = createModalSettings({
    widthModal: '428px',
    title: 'Nieuwe lijstweergave',
    maxHeightRollup: '100%',
    keepOnNavigation: true,
    onClose: () => {
        localStorage[ONBOARDING_LOCALSTORAGE_KEY] = true;
    }
});

@Component({
    selector: 'sl-onboarding-splash',
    imports: [CommonModule, ButtonComponent],
    templateUrl: './onboarding-splash.component.html',
    styleUrl: './onboarding-splash.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingSplashComponent {
    private _deviceService = inject(DeviceService);
    private _modalService = inject(ModalService);
    private _modalServiceHarmony = inject(ModalServiceHarmony);
    private _overlayService = inject(OverlayService);

    public isVerzorger = input.required<boolean>();
    public isMobile = derivedAsync(() => this._deviceService.isPhone$);

    public close() {
        this._modalServiceHarmony.animateAndClose();
    }

    public openInstellingen() {
        this._overlayService.closeAll();

        this._modalService.modal(
            AccountModalComponent,
            { initeleTab: 'Weergave' },
            createModalSettings({
                contentPadding: 0,
                heightRollup: FULL_SCREEN_MET_MARGIN,
                maxHeightRollup: 'unset',
                heightModal: '75%',
                showClose: false
            })
        );
    }
}
