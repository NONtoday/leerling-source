import { EmbeddedViewRef, Injectable, TemplateRef, Type, ViewContainerRef, inject } from '@angular/core';
import { DeviceService } from '../services/device.service';
import { SignalInputs } from '../signal-inputs/signal-inputs';
import { ModalSettings, createModalSettings } from './modal/component/modal.settings';
import { ModalService } from './modal/service/modal.service';
import { PopupService } from './popup/service/popup.service';
import { PopupSettings, createPopupSettings } from './popup/settings/popup-settings';

@Injectable({
    providedIn: 'root'
})
export class OverlayService {
    private deviceService = inject(DeviceService);
    private popupService = inject(PopupService);
    private modalService = inject(ModalService);

    popupOrModal<T, C>(
        type: Type<T> | TemplateRef<C>,
        connectedElement: ViewContainerRef,
        inputs: SignalInputs<T> | undefined = undefined,
        popupSettings: PopupSettings = createPopupSettings(),
        modalSettings: ModalSettings = createModalSettings()
    ): T | EmbeddedViewRef<C> {
        return this.deviceService.isTabletOrDesktop()
            ? this.popupService.popup(type, connectedElement, inputs, popupSettings)
            : this.modalService.modal(type, inputs, modalSettings);
    }

    isOpen = (connectedElement: ViewContainerRef) =>
        this.deviceService.isTabletOrDesktop() ? this.popupService.isOpen(connectedElement) : this.modalService.isOpen();

    close = (connectedElement: ViewContainerRef) => {
        if (connectedElement) this.popupService.close(connectedElement);
        this.modalService.animateAndClose();
    };

    closeAll = () => {
        this.popupService.closeAll();
        this.modalService.animateAndClose();
    };
}
