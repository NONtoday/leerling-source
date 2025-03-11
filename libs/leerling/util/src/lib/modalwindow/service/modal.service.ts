import {
    ApplicationRef,
    ComponentRef,
    effect,
    EffectRef,
    inject,
    Injectable,
    Injector,
    isSignal,
    Renderer2,
    RendererFactory2,
    Signal,
    Type,
    ViewContainerRef
} from '@angular/core';
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { SignalInputs } from 'harmony';
import { AccessibilityService } from '../../accessibility/accessibility.service';
import { getHTMLElement } from '../../component-ref.util';
import { KeyPressedService } from '../../keypressed/keypressed.service';
import { ModalComponent } from '../component/modal.component';
import { createModalSettings, ModalSettings } from '../component/modal.settings';

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    private _appRef = inject(ApplicationRef);
    private _injector = inject(Injector);
    private _rendererFactory = inject(RendererFactory2);
    private _keyPressedService = inject(KeyPressedService);
    private _accessibilityService = inject(AccessibilityService);
    private _renderer: Renderer2;

    private _modalRef: ComponentRef<ModalComponent> | undefined;
    private _inputEffectRef: EffectRef | undefined;

    constructor() {
        this._renderer = this._rendererFactory.createRenderer(null, null);
    }

    // Forceert dat het modal-window niet gesloten kan worden.
    // Dit is handig als je bv een actie aan het uitvoeren bent die (door traag internet) lang duurt.
    public setClosingBlocked(isBlocked: boolean): void {
        if (this._modalRef) this._modalRef.instance.closingBlocked = isBlocked;
    }

    modal<T>(
        componentType: Type<T>,
        inputs: SignalInputs<T> | Signal<SignalInputs<T>>,
        settings: ModalSettings = createModalSettings()
    ): T {
        if (this._modalRef) {
            this.close();
            throw Error('Er is al een modal window open, er wordt er maar 1 ondersteund ');
        }
        const viewContainerRef = this._appRef.components[0].instance['_viewContainerRef'] as ViewContainerRef;

        this._accessibilityService.disableHomeComponentTabIndex();
        this._keyPressedService.setOverlayOn();

        const modalComponent = viewContainerRef.createComponent(ModalComponent);
        modalComponent.instance.settings = settings;
        const modalElement = getHTMLElement(modalComponent);

        const contentComponent = modalComponent.instance.viewContainerRef.createComponent(componentType);
        const contentElement = getHTMLElement(contentComponent);
        if (isSignal(inputs)) {
            this._inputEffectRef = effect(() => this.setInputs(contentComponent, inputs()), {
                injector: this._injector
            });
        } else {
            this.setInputs(contentComponent, inputs);
        }

        modalComponent.instance.contentComponent = contentComponent.instance;

        this._renderer.addClass(contentElement, 'in-modal');
        this._renderer.appendChild(document.body, modalElement);
        this._renderer.appendChild(modalComponent.instance.contentRef.nativeElement, contentElement);

        disableBodyScroll(modalComponent.instance.contentRef.nativeElement);

        this._modalRef = modalComponent;
        return contentComponent.instance;
    }

    private setInputs<T>(componentRef: ComponentRef<T>, inputs: SignalInputs<T>) {
        Object.entries(inputs).forEach(([key, value]) => {
            componentRef.setInput(key, value);
        });
    }

    close() {
        if (this._modalRef) {
            enableBodyScroll(this._modalRef.instance.contentRef.nativeElement);
            this._accessibilityService.enableHomeComponentTabIndex();
            this._keyPressedService.setOverlayOff();

            this._inputEffectRef?.destroy();
            this._modalRef.instance.settings.onClose?.();
            this._modalRef.destroy();
        }
        this._modalRef = undefined;
        this._inputEffectRef = undefined;
    }

    animateAndClose() {
        this._modalRef?.instance.animateAndClose();
    }

    isOpen = () => !!this._modalRef;
}
