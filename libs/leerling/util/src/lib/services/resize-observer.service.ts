import { Injectable } from '@angular/core';
import { ResizeObserver as PolyfillObserver } from '@juggle/resize-observer';

const ResizeObserver = window.ResizeObserver || PolyfillObserver;

@Injectable({
    providedIn: 'root'
})
export class ResizeObserverService {
    private _resizeObserver: ResizeObserver;
    private _elementCallbackMap = new Map<Element, (entry: ResizeObserverEntry) => void>();

    constructor() {
        this._resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                this._elementCallbackMap.get(entry.target)?.(entry);
            });
        });
    }

    observe(element: Element, callback: (entry: ResizeObserverEntry) => void): void {
        this._elementCallbackMap.set(element, callback);
        this._resizeObserver.observe(element);
    }

    unobserve(element: Element): void {
        this._elementCallbackMap.delete(element);
        this._resizeObserver.unobserve(element);
    }
}
