import { Injectable, Renderer2, RendererFactory2, inject } from '@angular/core';
import { DarkMode, DarkModeListenerData, DarkModeListenerHandle } from '@aparajita/capacitor-dark-mode';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthenticationService } from 'leerling-authentication';
import { isIOS } from 'leerling-util';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Theme } from '../theme';
import {
    getDyslexiePreference,
    getOnvoldoendePreference,
    getProfielfotoVerbergen,
    getSysteemPreference,
    getThemePreference,
    saveDyslexiePreference,
    saveOnvoldoendePreference,
    saveProfielfotoVerbergen,
    saveSysteemPreference,
    saveThemePreference
} from './weergave-preferences-storage-util';

@Injectable({
    providedIn: 'root'
})
export class WeergaveService {
    private _authenticationService = inject(AuthenticationService);

    private static DEFAULT_DYSLEXIA_VOORKEUR = false;
    private static DEFAULT_SYSTEEM_VOORKEUR = true;
    private static DEFAULT_ONVOLDOENDE_ROOD_VOORKEUR = true;
    private static DEFAULT_PROFIELFOTO_VERBERGEN_VOORKEUR = false;

    private _rendererFactory = inject(RendererFactory2);
    private _renderer: Renderer2;
    private _selectedTheme = new BehaviorSubject<Theme>('light');
    private _systeemVoorkeur = new BehaviorSubject<boolean>(true);
    private _dyslexieLettertype = new BehaviorSubject<boolean>(false);
    private _toonOnvoldoendeRood = new BehaviorSubject<boolean>(false);
    private _profielfotoVerbergen = new BehaviorSubject<boolean>(false);

    private _darkModeListenerHandle: DarkModeListenerHandle | undefined;

    constructor() {
        this._renderer = this._rendererFactory.createRenderer(null, null);
    }

    public getSelectedTheme$(): Observable<Theme> {
        return this._selectedTheme.asObservable();
    }

    public getSysteemVoorkeur$(): Observable<boolean> {
        return this._systeemVoorkeur.asObservable();
    }

    public getDyslexieLettertype$(): Observable<boolean> {
        return this._dyslexieLettertype.asObservable();
    }

    public getToonOnvoldoendeRood$(): Observable<boolean> {
        return this._toonOnvoldoendeRood.asObservable();
    }

    public getProfielFotoVerbergen$(): Observable<boolean> {
        return this._profielfotoVerbergen
            .asObservable()
            .pipe(map((profielfotoVerbergen) => profielfotoVerbergen && this._authenticationService.isCurrentContextLeerling));
    }

    private _setTheme(theme: Theme) {
        if (theme === this._selectedTheme.value) return;

        switch (theme) {
            case 'light':
                this._renderer.removeClass(document.documentElement, 'dark');
                break;
            case 'dark':
                this._renderer.addClass(document.documentElement, 'dark');
                break;
        }
        if (isIOS()) {
            StatusBar.setStyle({ style: 'dark' === theme ? Style.Dark : Style.Light });
        }
        this._selectedTheme.next(theme);
        saveThemePreference(theme);
    }

    public setTheme(theme: Theme) {
        this.setSysteemVoorkeur(false);
        this._setTheme(theme);
    }

    public async setSysteemVoorkeur(voorkeur: boolean) {
        this._darkModeListenerHandle?.remove();
        this._darkModeListenerHandle = undefined;

        if (voorkeur) {
            const currentSystemPref: boolean = (await DarkMode.isDarkMode())?.dark;
            currentSystemPref ? this._setTheme('dark') : this._setTheme('light');
            this._darkModeListenerHandle = await DarkMode.addAppearanceListener((data: DarkModeListenerData) => {
                this._setTheme(data.dark ? 'dark' : 'light');
            });
        }
        this._systeemVoorkeur.next(voorkeur);
        saveSysteemPreference(voorkeur);
    }

    public setDyslexieLettertype(voorkeur: boolean) {
        voorkeur ? this._renderer.addClass(document.body, 'dyslexie') : this._renderer.removeClass(document.body, 'dyslexie');
        this._dyslexieLettertype.next(voorkeur);
        saveDyslexiePreference(voorkeur);
    }

    public setToonOnvoldoendeRood(voorkeur: boolean) {
        voorkeur
            ? document.documentElement.style.setProperty('--onvoldoende-color', 'var(--action-negative-normal)')
            : document.documentElement.style.setProperty('--onvoldoende-color', 'var(--text-strong)');
        this._toonOnvoldoendeRood.next(voorkeur);
        saveOnvoldoendePreference(voorkeur);
    }

    public setProfielfotoVerbergen(voorkeur: boolean) {
        this._profielfotoVerbergen.next(voorkeur);
        saveProfielfotoVerbergen(voorkeur);
    }

    public toggleDyslexieLettertype() {
        this.setDyslexieLettertype(!this._dyslexieLettertype.value);
    }

    public async toggleSysteemVoorkeur() {
        return this.setSysteemVoorkeur(!this._systeemVoorkeur.value);
    }

    public async toggleToonOnvoldoendesRood() {
        return this.setToonOnvoldoendeRood(!this._toonOnvoldoendeRood.value);
    }

    public async toggleProfielfotoVerbergen() {
        return this.setProfielfotoVerbergen(!this._profielfotoVerbergen.value);
    }

    public async initializeFromPreferences() {
        await DarkMode.init({
            cssClass: 'system-preference-dark'
        });
        const theme: Theme = await getThemePreference();
        const systeem: boolean | null = await getSysteemPreference();
        const dyslexie: boolean | null = await getDyslexiePreference();
        const toonOnvoldoendeRood: boolean | null = await getOnvoldoendePreference();
        const profielfotoVerbergen: boolean | null = await getProfielfotoVerbergen();
        this._setTheme(theme);
        await this.setSysteemVoorkeur(systeem === null ? WeergaveService.DEFAULT_SYSTEEM_VOORKEUR : systeem);
        this.setDyslexieLettertype(dyslexie === null ? WeergaveService.DEFAULT_DYSLEXIA_VOORKEUR : dyslexie);
        this.setToonOnvoldoendeRood(toonOnvoldoendeRood === null ? WeergaveService.DEFAULT_ONVOLDOENDE_ROOD_VOORKEUR : toonOnvoldoendeRood);
        this.setProfielfotoVerbergen(
            profielfotoVerbergen === null ? WeergaveService.DEFAULT_PROFIELFOTO_VERBERGEN_VOORKEUR : profielfotoVerbergen
        );
    }
}
