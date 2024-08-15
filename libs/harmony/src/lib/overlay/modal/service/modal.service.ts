import { ComponentRef, EmbeddedViewRef, inject, Injectable, RendererFactory2, TemplateRef, Type } from '@angular/core';
import { enableBodyScroll } from 'body-scroll-lock';
import { ConfirmModalComponent } from '../../../confirm-modal/confirm-modal.component';
import { SignalInputs } from '../../../signal-inputs/signal-inputs';
import { disableBodyScrollWithTouchMove } from '../../disable-body-scroll';
import { getHTMLElement } from '../../overlay.utils';
import { APP_VIEWCONTAINER_REF } from '../app-container-ref-token';
import { ModalComponent } from '../component/modal.component';
import { createModalSettings, ModalSettings } from '../component/modal.settings';

interface ModalInput {
    settings?: Partial<ModalSettings> | undefined;
}

interface ComponentModalInput<Component> extends ModalInput {
    component: Type<Component>;
    template?: never;
    inputs?: SignalInputs<Component> | undefined;
}

interface TemplateModalInput<Template> extends ModalInput {
    template: TemplateRef<Template>;
    component?: never;
    inputs?: never;
}

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

    confirmModal(inputs: SignalInputs<ConfirmModalComponent>, settings?: Partial<ModalSettings>) {
        return this.modal({ component: ConfirmModalComponent, inputs, settings });
    }

    modal<Component>(input: ComponentModalInput<Component>): Component;
    modal<Template>(input: TemplateModalInput<Template>): EmbeddedViewRef<Template>;
    modal<Component, Template>({ template, component, inputs, settings }: ComponentModalInput<Component> | TemplateModalInput<Template>) {
        const fullSettings = createModalSettings(settings);
        if (this.modalRef) {
            this.animateAndClose();
            throw new Error('Er is al een modal window open, er wordt er maar 1 ondersteund');
        }

        const modalComponentRef = this.appContainerRef.createComponent(ModalComponent);
        modalComponentRef.setInput('settings', fullSettings);

        const modalElement = getHTMLElement(modalComponentRef);
        modalComponentRef.instance.closeModal.subscribe(() => {
            if (this.modalRef) {
                fullSettings.onClose?.();
                enableBodyScroll(modalComponentRef.instance.containerRef().nativeElement);
                this.modalRef.destroy();
                // give the modal ref time to be destroyed
                setTimeout(() => (this.modalRef = undefined));
            }
        });

        this.renderer.appendChild(document.body, modalElement);

        disableBodyScrollWithTouchMove(modalComponentRef.instance.containerRef().nativeElement);

        this.modalRef = modalComponentRef;

        if (template) {
            return modalComponentRef.instance.contentRef.createEmbeddedView(template);
        }

        const contentComponent = modalComponentRef.instance.contentRef.createComponent(component);
        if (contentComponent instanceof ComponentRef && inputs) {
            const contentElement = getHTMLElement(contentComponent);
            Object.entries(inputs).forEach(([key, value]) => {
                contentComponent.setInput(key, value);
            });
            this.renderer.addClass(contentElement, 'in-modal');
        }

        return contentComponent.instance;
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
