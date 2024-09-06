import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ButtonComponent, DeviceService, IconDirective, ModalService, createModalSettings } from 'harmony';
import { derivedAsync } from 'ngxtension/derived-async';

export const ONBOARDING_LOCALSTORAGE_KEY = 'onboarding-had-first-login';
export const ONBOARDING_MODAL_SETTINGS = createModalSettings({
    widthModal: '428px',
    title: 'Somtoday is vernieuwd!',
    maxHeightRollup: '100%',
    keepOnNavigation: true,
    onClose: () => {
        localStorage[ONBOARDING_LOCALSTORAGE_KEY] = true;
    }
});

@Component({
    selector: 'sl-onboarding-splash',
    standalone: true,
    imports: [CommonModule, ButtonComponent, IconDirective],
    templateUrl: './onboarding-splash.component.html',
    styleUrl: './onboarding-splash.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingSplashComponent {
    private _deviceService = inject(DeviceService);
    private _modalService = inject(ModalService);

    public isVerzorger = input.required<boolean>();
    public isMobile = derivedAsync(() => this._deviceService.isPhone$);

    public close() {
        this._modalService.animateAndClose();
    }
}
