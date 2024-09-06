import { Injectable, signal, WritableSignal } from '@angular/core';

const CIJFERS = 'Cijfers';

@Injectable({
    providedIn: 'root'
})
export class CijfersService {
    private _scrollableTitle: WritableSignal<string | undefined> = signal<string | undefined>('');
    private _toonTabs: WritableSignal<boolean> = signal<boolean>(false);

    public setCijfersMetTabs() {
        this._scrollableTitle.set(CIJFERS);
        this._toonTabs.set(true);
    }

    public reset() {
        this._scrollableTitle.set('');
        this._toonTabs.set(false);
    }

    public setScrollableTitle(title: string | undefined) {
        this._scrollableTitle.set(title);
    }

    public setToonTabs(toonTabs: boolean) {
        this._toonTabs.set(toonTabs);
    }

    public get scrollableTitle(): WritableSignal<string | undefined> {
        return this._scrollableTitle;
    }

    public get toonTabs() {
        return this._toonTabs;
    }
}
