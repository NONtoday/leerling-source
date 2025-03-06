import { Injectable, Signal, Type, ViewContainerRef, inject } from '@angular/core';
import { DeviceService, SignalInputs } from 'harmony';
import { ModalSettings, createModalSettings } from '../modalwindow/component/modal.settings';
import { ModalService } from '../modalwindow/service/modal.service';
import { PopupSettings, createPopupSettings } from '../popup/popup-settings';
import { PopupService } from '../popup/service/popup.service';
import { SidebarService } from '../sidebar/service/sidebar.service';
import { SidebarCloseTrigger } from '../sidebar/sidebar-model';
import { SidebarSettings } from '../sidebar/sidebar-settings';

@Injectable({
    providedIn: 'root'
})
export class OverlayService {
    private _deviceService = inject(DeviceService);
    private _popupService = inject(PopupService);
    private _modalService = inject(ModalService);
    private _sidebarService = inject(SidebarService);

    // Houdt bij welke popups deze service geopend heeft, zodat deze ook vanaf hier gesloten kunnen worden.
    // Key: component instance, value: popupUuid.
    private _openedPopups = new Map<any, string>();

    // Component wat geopend is in een modal
    private _modalComponent: any;

    // Component wat geopend is in een sidebar
    private _sidebarComponent: any;

    popupOrModal<T>(
        type: Type<T>,
        inputs: SignalInputs<T> | Signal<SignalInputs<T>>,
        popupSettings: PopupSettings = createPopupSettings(),
        modalSettings: ModalSettings = createModalSettings(),
        connectedElement: ViewContainerRef
    ): T {
        if (this._deviceService.isTabletOrDesktop()) {
            return this.openPopup(type, inputs, popupSettings, connectedElement);
        } else {
            return this.openModal(type, inputs, modalSettings);
        }
    }

    sidebarOrModal<T>(
        type: Type<T>,
        inputs: SignalInputs<T> | Signal<SignalInputs<T>>,
        sidebarSettings: SidebarSettings,
        modalSettings: ModalSettings = createModalSettings()
    ): T {
        if (this._deviceService.isTabletOrDesktop()) {
            return this.openSidebar(type, inputs, sidebarSettings);
        } else {
            return this.openModal(type, inputs, modalSettings);
        }
    }

    animateAndClose(component: any) {
        const uuid = this._openedPopups.get(component);
        if (uuid) {
            this._popupService.animateAndClose(uuid);
            this._openedPopups.delete(component);
        } else if (this._modalComponent) {
            this._modalService.animateAndClose();
            this._modalComponent = undefined;
        } else if (this._sidebarComponent) {
            this._sidebarService.animateAndClose();
            this._sidebarComponent = undefined;
        }
    }

    close(component: any, closeTrigger: SidebarCloseTrigger) {
        const uuid = this._openedPopups.get(component);
        if (uuid) {
            this._popupService.close(uuid);
            this._openedPopups.delete(component);
        } else if (this._modalComponent) {
            this._modalService.close();
            this._modalComponent = undefined;
        } else if (this._sidebarComponent) {
            this._sidebarService.close(true, closeTrigger);
            this._sidebarComponent = undefined;
        }
    }

    private openSidebar<T>(type: Type<T>, inputs: SignalInputs<T> | Signal<SignalInputs<T>>, sidebarSettings: SidebarSettings): T {
        this._sidebarComponent = this._sidebarService.push(type, inputs, sidebarSettings);
        return this._sidebarComponent;
    }

    private openModal<T>(type: Type<T>, inputs: SignalInputs<T> | Signal<SignalInputs<T>>, modalSettings: ModalSettings): T {
        this._modalComponent = this._modalService.modal(type, inputs, modalSettings);
        return this._modalComponent;
    }
    private openPopup<T>(
        type: Type<T>,
        inputs: SignalInputs<T> | Signal<SignalInputs<T>>,
        popupSettings: PopupSettings,
        connectedElement: ViewContainerRef
    ): T {
        const popupResult = this._popupService.popup(type, inputs, connectedElement, popupSettings);
        this._openedPopups.set(popupResult.component, popupResult.uuid);
        return popupResult.component;
    }
}
