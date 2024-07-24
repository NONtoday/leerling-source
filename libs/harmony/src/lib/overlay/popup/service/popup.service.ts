import { ComponentRef, EmbeddedViewRef, inject, Injectable, RendererFactory2, TemplateRef, Type, ViewContainerRef } from '@angular/core';
import { enableBodyScroll } from 'body-scroll-lock';
import { match } from 'ts-pattern';
import { SignalInputs } from '../../../signal-inputs/signal-inputs';
import { disableBodyScrollWithTouchMove } from '../../disable-body-scroll';
import { getHTMLElement } from '../../overlay.utils';
import { AnimationState, PopupComponent } from '../component/popup.component';
import { BoundingClientRect } from '../popup.model';
import { createPopupSettings, PopupSettings } from '../settings/popup-settings';

@Injectable({
    providedIn: 'root'
})
export class PopupService {
    private renderer = inject(RendererFactory2).createRenderer(null, null);
    private openPopups = new Map<ViewContainerRef, ComponentRef<PopupComponent>>();

    popup<T, C>(
        componentOrTemplate: Type<T> | TemplateRef<C>,
        connectedElement: ViewContainerRef,
        inputs: SignalInputs<T> | undefined = undefined,
        settings: PopupSettings = createPopupSettings()
    ): T | EmbeddedViewRef<C> {
        this.scrollElementVerticalInViewport(
            connectedElement.element.nativeElement.getBoundingClientRect() satisfies BoundingClientRect,
            settings.offsets.top,
            settings.offsets.bottom,
            settings.scrollOffset
        );

        const popupComponentRef = connectedElement.createComponent(PopupComponent);
        popupComponentRef.setInput('settings', settings);
        popupComponentRef.setInput('connectedElement', connectedElement);
        popupComponentRef.instance.animationState.set(
            match(settings.animation)
                .returnType<AnimationState>()
                .with('fade', () => 'fade-visible')
                .with('slide', () => 'slide-visible')
                .with('none', () => undefined)
                .exhaustive()
        );
        const popupElement = getHTMLElement(popupComponentRef);

        // Zorg ervoor dat klikken op het connectedElement de popup niet opnieuw opent.
        connectedElement.element.nativeElement.style.pointerEvents = 'none';

        popupComponentRef.instance.closePopup.subscribe(() => {
            settings.onClose?.();
            connectedElement.element.nativeElement.style.pointerEvents = 'auto';
            this.renderer.removeClass(connectedElement.element.nativeElement, settings.popupOpenClass);
            enableBodyScroll(popupElement);
            popupComponentRef.destroy();
            this.openPopups.delete(connectedElement);
        });

        const contentComponentRef =
            componentOrTemplate instanceof TemplateRef
                ? popupComponentRef.instance.contentRef.createEmbeddedView(componentOrTemplate)
                : popupComponentRef.instance.contentRef.createComponent(componentOrTemplate);
        if (contentComponentRef instanceof ComponentRef && inputs) {
            const contentElement = getHTMLElement(contentComponentRef);
            this.renderer.addClass(contentElement, 'in-popup');
            Object.entries(inputs).forEach(([key, value]) => {
                contentComponentRef.setInput(key, value);
            });
            this.renderer.appendChild(popupElement, contentElement);
        }

        this.renderer.addClass(connectedElement.element.nativeElement, settings.popupOpenClass);
        this.renderer.appendChild(document.body, popupElement);

        disableBodyScrollWithTouchMove(popupElement);

        this.openPopups.set(connectedElement, popupComponentRef);

        return contentComponentRef instanceof ComponentRef ? contentComponentRef.instance : contentComponentRef;
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
