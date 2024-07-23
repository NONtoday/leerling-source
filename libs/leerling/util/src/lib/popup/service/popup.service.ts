import {
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
import { enableBodyScroll } from 'body-scroll-lock';
import { shareReplayLastValue, SignalInputs } from 'harmony';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { getHTMLElement } from '../../component-ref.util';
import { disableBodyScrollWithTouchMove } from '../../disable-body-scroll.util';
import { DEFAULT_SCROLL_OFFSET, PopupSettings } from '../popup-settings';
import { PopupComponent } from '../popup.component';
import { BoundingClientRect, PopupResult } from '../popup.modals';

@Injectable({
    providedIn: 'root'
})
export class PopupService {
    private _injector = inject(Injector);
    private _rendererFactory = inject(RendererFactory2);
    private _renderer: Renderer2;
    private _openPopupsMap = new Map<string, ComponentRef<PopupComponent>>();
    private _inputEffectsMap = new Map<string, EffectRef>();
    private _openPopupsSubject: BehaviorSubject<ComponentRef<PopupComponent>[]> = new BehaviorSubject([]);

    constructor() {
        this._renderer = this._rendererFactory.createRenderer(null, null);
    }

    popup<T>(
        componentType: Type<T>,
        inputs: SignalInputs<T> | Signal<SignalInputs<T>>,
        connectedElement: ViewContainerRef,
        settings: PopupSettings
    ): PopupResult<T> {
        this.scrollElementVerticalInViewport(
            connectedElement.element.nativeElement.getBoundingClientRect() satisfies BoundingClientRect,
            settings.offsets?.top ?? 0,
            settings.offsets?.bottom ?? 0,
            settings.scrollOffset ?? DEFAULT_SCROLL_OFFSET
        );

        const popupUuid = uuidv4();
        const popupComponent = connectedElement.createComponent(PopupComponent);
        popupComponent.instance.settings = settings;
        popupComponent.instance.connectedElement = connectedElement;
        popupComponent.instance.uuid = popupUuid;
        const popupElement = getHTMLElement(popupComponent);

        const contentComponent = popupComponent.instance.viewContainerRef.createComponent(componentType);
        const contentElement = getHTMLElement(contentComponent);
        if (isSignal(inputs)) {
            const effectRef = effect(() => this.setInputs(contentComponent, inputs()), {
                injector: this._injector
            });
            this._inputEffectsMap.set(popupUuid, effectRef);
        } else {
            this.setInputs(contentComponent, inputs);
        }

        this._renderer.addClass(contentElement, 'in-popup');
        this._renderer.appendChild(popupElement, contentElement);
        this._renderer.appendChild(document.body, popupElement);

        disableBodyScrollWithTouchMove(popupElement);

        this._openPopupsMap.set(popupUuid, popupComponent);
        this._openPopupsSubject.next([...this._openPopupsMap.values()]);

        return {
            uuid: popupUuid,
            component: contentComponent.instance
        };
    }

    private setInputs<T>(componentRef: ComponentRef<T>, inputs: SignalInputs<T>) {
        Object.entries(inputs).forEach(([key, value]) => {
            componentRef.setInput(key, value);
        });
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

    public get openPopups$() {
        return this._openPopupsSubject.asObservable().pipe(shareReplayLastValue());
    }

    public animateAndClose(uuid: string) {
        const component = this._openPopupsMap.get(uuid);
        if (component) {
            component.instance.animateAndClose();
        }
    }

    public close(uuid: string) {
        const component = this._openPopupsMap.get(uuid);
        if (component) {
            enableBodyScroll(getHTMLElement(component));
            component.instance.settings.onClose?.();
            component.destroy();
        }
        this._inputEffectsMap.get(uuid)?.destroy();
        this._inputEffectsMap.delete(uuid);
        this._openPopupsMap.delete(uuid);
        this._openPopupsSubject.next([...this._openPopupsMap.values()]);
    }
}
