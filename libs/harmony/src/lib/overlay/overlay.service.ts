import { EmbeddedViewRef, Injectable, TemplateRef, Type, ViewContainerRef, inject } from '@angular/core';
import { DeviceService } from '../services/device.service';
import { SignalInputs } from '../signal-inputs/signal-inputs';
import { ModalSettings, createModalSettings } from './modal/component/modal.settings';
import { ModalService } from './modal/service/modal.service';
import { PopupService } from './popup/service/popup.service';
import { PopupSettings, createPopupSettings } from './popup/settings/popup-settings';

export interface OverlayInput {
    element: ViewContainerRef;
    popupSettings?: Partial<PopupSettings>;
    modalSettings?: Partial<ModalSettings>;
}

export interface ComponentOverlayInput<Component> extends OverlayInput {
    component: Type<Component>;
    template?: never;
    inputs?: SignalInputs<Component> | undefined;
    context?: never;
}

export interface TemplateOverlayInput<Template> extends OverlayInput {
    template: TemplateRef<Template>;
    component?: never;
    inputs?: never;
    context?: Template;
}

@Injectable({
    providedIn: 'root'
})
export class OverlayService {
    private deviceService = inject(DeviceService);
    private popupService = inject(PopupService);
    private modalService = inject(ModalService);

    popupOrModal<Component>(input: ComponentOverlayInput<Component>): Component;
    popupOrModal<Template>(input: TemplateOverlayInput<Template>): EmbeddedViewRef<Template>;
    popupOrModal<Component, Template>({
        component,
        template,
        element,
        inputs,
        context,
        popupSettings = createPopupSettings(),
        modalSettings = createModalSettings()
    }: ComponentOverlayInput<Component> | TemplateOverlayInput<Template>) {
        if (component) {
            return this.deviceService.isTabletOrDesktop()
                ? this.popupService.popup<Component>({ component, element, inputs, settings: popupSettings })
                : this.modalService.modal<Component>({ component, inputs, settings: modalSettings });
        }
        if (!template) throw new Error('Either component or template must be provided');
        return this.deviceService.isTabletOrDesktop()
            ? this.popupService.popup<Template>({ template, element, context, settings: popupSettings })
            : this.modalService.modal<Template>({ template, context, settings: modalSettings });
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
