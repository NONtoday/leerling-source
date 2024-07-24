import { ComponentRef, EmbeddedViewRef, inject, Injectable, RendererFactory2, TemplateRef, Type } from '@angular/core';
import { enableBodyScroll } from 'body-scroll-lock';
import { ConfirmModalComponent } from '../../../confirm-modal/confirm-modal.component';
import { SignalInputs } from '../../../signal-inputs/signal-inputs';
import { disableBodyScrollWithTouchMove } from '../../disable-body-scroll';
import { getHTMLElement } from '../../overlay.utils';
import { APP_VIEWCONTAINER_REF } from '../app-container-ref-token';
import { ModalComponent } from '../component/modal.component';
import { createModalSettings, ModalSettings } from '../component/modal.settings';

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    private readonly renderer = inject(RendererFactory2).createRenderer(null, null);
    private readonly appContainerRef = inject(APP_VIEWCONTAINER_REF);
    private modalRef: ComponentRef<ModalComponent> | undefined;

    // Forceert dat het modal-window niet gesloten kan worden.
    // Dit is handig als je bv een actie aan het uitvoeren bent die (door traag internet) lang duurt.
    public setClosingBlocked(isBlocked: boolean): void {
        if (this.modalRef) this.modalRef.instance.closingBlocked = isBlocked;
    }

    confirmModal(inputs: SignalInputs<ConfirmModalComponent>, settings: ModalSettings = createModalSettings()) {
        return this.modal(ConfirmModalComponent, inputs, settings) as ConfirmModalComponent;
    }

    modal<T, C>(
        componentType: Type<T> | TemplateRef<C>,
        inputs: SignalInputs<T> | undefined = undefined,
        settings: ModalSettings = createModalSettings()
    ): T | EmbeddedViewRef<C> {
        if (this.modalRef) {
            this.animateAndClose();
            throw new Error('Er is al een modal window open, er wordt er maar 1 ondersteund');
        }

        const modalComponentRef = this.appContainerRef.createComponent(ModalComponent);
        modalComponentRef.setInput('settings', settings);

        const modalElement = getHTMLElement(modalComponentRef);
        modalComponentRef.instance.closeModal.subscribe(() => {
            if (this.modalRef) {
                settings.onClose?.();
                enableBodyScroll(modalComponentRef.instance.containerRef().nativeElement);
                this.modalRef.destroy();
                // give the modal ref time to be destroyed
                setTimeout(() => (this.modalRef = undefined));
            }
        });

        const contentComponent =
            componentType instanceof TemplateRef
                ? modalComponentRef.instance.contentRef.createEmbeddedView(componentType)
                : modalComponentRef.instance.contentRef.createComponent(componentType);

        if (contentComponent instanceof ComponentRef && inputs) {
            const contentElement = getHTMLElement(contentComponent);
            Object.entries(inputs).forEach(([key, value]) => {
                contentComponent.setInput(key, value);
            });
            this.renderer.addClass(contentElement, 'in-modal');
        }

        this.renderer.appendChild(document.body, modalElement);

        disableBodyScrollWithTouchMove(modalComponentRef.instance.containerRef().nativeElement);

        this.modalRef = modalComponentRef;
        return contentComponent instanceof ComponentRef ? contentComponent.instance : contentComponent;
    }

    isOpen = () => !!this.modalRef;
    animateAndClose() {
        if (this.modalRef?.instance.closingBlocked) return;
        this.modalRef?.instance.animateAndClose();
    }

    onClose(callback: () => void) {
        if (!this.modalRef) {
            return console.error(`Geen open modal`);
        }
        this.modalRef.instance.closeModal.subscribe(callback);
    }
}
