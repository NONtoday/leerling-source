import { Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, fromEvent } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class KeyPressedService {
    private _isOverlayVisible = false;

    private _mainKeyboardEventSubject = new Subject<KeyboardEvent>();
    private _overlayKeyboardEventSubject = new Subject<KeyboardEvent>();

    constructor() {
        fromEvent(window, 'keydown')
            .pipe(takeUntilDestroyed())
            .subscribe((event: KeyboardEvent) => this.handleKeyEvent(event));
    }

    public setOverlayOn() {
        this._isOverlayVisible = true;
    }

    public setOverlayOff() {
        this._isOverlayVisible = false;
    }

    public handleKeyEvent(e: KeyboardEvent) {
        if (this._isOverlayVisible) {
            this._overlayKeyboardEventSubject.next(e);
        } else {
            this._mainKeyboardEventSubject.next(e);
        }
    }

    static isShiftTabEvent(e: KeyboardEvent): boolean {
        return e.shiftKey && e.key === 'Tab';
    }

    get mainKeyboardEvent$(): Observable<KeyboardEvent> {
        return this._mainKeyboardEventSubject.asObservable();
    }

    get overlayKeyboardEvent$(): Observable<KeyboardEvent> {
        return this._overlayKeyboardEventSubject.asObservable();
    }
}
