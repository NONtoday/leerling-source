import { ComponentRef, EmbeddedViewRef, inject, Injectable, RendererFactory2, TemplateRef, Type, ViewContainerRef } from '@angular/core';
import { enableBodyScroll } from 'body-scroll-lock';
import { match } from 'ts-pattern';
import { SignalInputs } from '../../../signal-inputs/signal-inputs';
import { disableBodyScrollWithTouchMove } from '../../disable-body-scroll';
import { getHTMLElement } from '../../overlay.utils';
import { AnimationState, PopupComponent } from '../component/popup.component';
import { BoundingClientRect } from '../popup.model';
import { createPopupSettings, PopupSettings } from '../settings/popup-settings';

interface PopupInput {
    element: ViewContainerRef;
    settings?: Partial<PopupSettings> | undefined;
}

interface ComponentPopupInput<Component> extends PopupInput {
    component: Type<Component>;
    template?: never;
    inputs?: SignalInputs<Component> | undefined;
}

interface TemplatePopupInput<Template> extends PopupInput {
    template: TemplateRef<Template>;
    component?: never;
    inputs?: never;
}

@Injectable({
    providedIn: 'root'
})
export class PopupService {
    private renderer = inject(RendererFactory2).createRenderer(null, null);
    private openPopups = new Map<ViewContainerRef, ComponentRef<PopupComponent>>();

    popup<Component>(input: ComponentPopupInput<Component>): Component;
    popup<Template>(input: TemplatePopupInput<Template>): EmbeddedViewRef<Template>;
    popup<Component, Template>({
        component,
        template,
        element,
        inputs,
        settings
    }: ComponentPopupInput<Component> | TemplatePopupInput<Template>) {
        const fullSettings = createPopupSettings(settings);

        this.scrollElementVerticalInViewport(
            element.element.nativeElement.getBoundingClientRect() satisfies BoundingClientRect,
            fullSettings.offsets.top,
            fullSettings.offsets.bottom,
            fullSettings.scrollOffset
        );

        const popupComponentRef = element.createComponent(PopupComponent);
        popupComponentRef.setInput('settings', fullSettings);
        popupComponentRef.setInput('connectedElement', element);
        popupComponentRef.instance.animationState.set(
            match(fullSettings.animation)
                .returnType<AnimationState>()
                .with('fade', () => 'fade-visible')
                .with('slide', () => 'slide-visible')
                .with('none', () => undefined)
                .exhaustive()
        );
        const popupElement = getHTMLElement(popupComponentRef);

        // Zorg ervoor dat klikken op het connectedElement de popup niet opnieuw opent.
        this.renderer.setStyle(element.element.nativeElement, 'pointer-events', 'none');

        popupComponentRef.instance.closePopup.subscribe(() => {
            fullSettings.onClose?.();
            this.renderer.removeClass(element.element.nativeElement, fullSettings.popupOpenClass);
            this.renderer.removeStyle(element.element.nativeElement, 'pointer-events');
            enableBodyScroll(popupElement);
            popupComponentRef.destroy();
            this.openPopups.delete(element);
        });
        this.renderer.addClass(element.element.nativeElement, fullSettings.popupOpenClass);
        this.renderer.appendChild(this.getDomElement(element, fullSettings), popupElement);

        disableBodyScrollWithTouchMove(popupElement);

        this.openPopups.set(element, popupComponentRef);

        if (component) {
            const contentComponentRef = popupComponentRef.instance.contentRef.createComponent(component);
            const contentElement = getHTMLElement(contentComponentRef);
            this.renderer.addClass(contentElement, 'in-popup');
            if (inputs) {
                Object.entries(inputs).forEach(([key, value]) => {
                    contentComponentRef.setInput(key, value);
                });
            }
            this.renderer.appendChild(popupElement, contentElement);
            return contentComponentRef.instance;
        }

        return popupComponentRef.instance.contentRef.createEmbeddedView(template);
    }

    private getDomElement(connectedElement: ViewContainerRef, settings: PopupSettings) {
        switch (settings.domPosition) {
            case 'body': {
                return document.body;
            }
            case 'sibling': {
                const parent = connectedElement.element.nativeElement.parentNode;
                return parent ?? document.body;
            }
            default: {
                return document.body;
            }
        }
    }

    private scrollElementVerticalInViewport(
        connectedLocation: BoundingClientRect,
        topOffset: number,
        bottomOffset: number,
        scrollOffset: number
    ) {
        const currentViewport = {
            top: window.scrollY + topOffset,
            bottom: window.scrollY + window.innerHeight - bottomOffset
        };

        if (connectedLocation.top + window.scrollY < currentViewport.top) {
            window.scrollBy({
                top: -(currentViewport.top + scrollOffset - (connectedLocation.top + window.scrollY)),
                behavior: 'auto'
            });
        } else if (connectedLocation.bottom + window.scrollY > currentViewport.bottom) {
            window.scrollBy({
                top: connectedLocation.bottom + window.scrollY - currentViewport.bottom + scrollOffset,
                behavior: 'auto'
            });
        }
    }

    isOpen = (connectedElement: ViewContainerRef) => this.openPopups.has(connectedElement);
    close = (connectedElement: ViewContainerRef) => this.openPopups.get(connectedElement)?.instance.animateAndClose();
    closeAll = () => this.openPopups.forEach((popup) => popup.instance.animateAndClose());
}
