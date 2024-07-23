import {
    ApplicationRef,
    ComponentRef,
    DestroyRef,
    EffectRef,
    Injectable,
    Injector,
    Renderer2,
    RendererFactory2,
    Signal,
    Type,
    ViewContainerRef,
    effect,
    inject,
    isSignal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { SignalInputs } from 'harmony';
import { finalize, take } from 'rxjs';
import { AccessibilityService } from '../../accessibility/accessibility.service';
import { getHTMLElement } from '../../component-ref.util';
import { KeyPressedService } from '../../keypressed/keypressed.service';
import { SidebarPageComponent } from '../../sidebar-page/sidebar-page.component';
import { CloseSidebarUtil, SidebarCloseGuard, SidebarCloseTrigger, SidebarCloseTriggers } from '../sidebar-model';
import { SidebarSettings } from '../sidebar-settings';
import { SidebarComponent } from '../sidebar.component';

export interface SidebarPageInformation {
    closeGuard?: {
        guard: SidebarCloseGuard;
        triggers: ReadonlyArray<SidebarCloseTrigger>;
    };
    contentComponentType: Type<unknown>;
    pageRef: ComponentRef<SidebarPageComponent>;
    sidebarRef: ComponentRef<SidebarComponent>;
    settings: SidebarSettings;
    effectRef?: EffectRef;
}

export type PointerEventType = 'auto' | 'none';

@Injectable({
    providedIn: 'root'
})
export class SidebarService {
    private _destroyRef = inject(DestroyRef);
    private _keyPressedService = inject(KeyPressedService);
    private _accessibilityService = inject(AccessibilityService);
    private _rendererFactory = inject(RendererFactory2);
    private _renderer: Renderer2;
    private _sidebarRef: ComponentRef<SidebarComponent> | undefined;

    private _pages: SidebarPageInformation[] = [];
    private _pageWithActiveCloseGuard?: SidebarPageInformation;

    private _appRef = inject(ApplicationRef);
    private _injector = inject(Injector);

    constructor() {
        this._renderer = this._rendererFactory.createRenderer(null, null);
    }

    // Forceert dat het sidebar niet gesloten kan worden.
    // Dit is handig als je bv een actie aan het uitvoeren bent die (door traag internet) lang duurt.
    public closingBlocked = false;

    push<T>(componentType: Type<T>, inputs: SignalInputs<T> | Signal<SignalInputs<T>>, settings: SidebarSettings): T {
        const viewContainerRef = this._appRef.components[0].instance['_viewContainerRef'] as ViewContainerRef;

        this._accessibilityService.disableHomeComponentTabIndex();
        this._keyPressedService.setOverlayOn();

        const sidebarComponent = this._sidebarRef ?? viewContainerRef.createComponent(SidebarComponent);
        const sidebarElement = getHTMLElement(sidebarComponent);
        this.setSidebarPointerEvents('none');

        const sidebarPageComponent = viewContainerRef.createComponent(SidebarPageComponent);
        sidebarPageComponent.setInput('title', settings.title);
        sidebarPageComponent.setInput('showBackButton', this._pages.length > 0);
        sidebarPageComponent.setInput('hideMobileBackButton', settings.hideMobileBackButton ?? false);
        sidebarPageComponent.setInput('headerType', settings.headerType);
        sidebarPageComponent.setInput('iconLeft', settings.iconLeft);
        sidebarPageComponent.setInput('iconsRight', settings.iconsRight);
        sidebarPageComponent.setInput('vakIcon', settings.vakIcon);
        const sidebarPageElement = getHTMLElement(sidebarPageComponent);
        // Voeg z-index toe dat de pages altijd over elkaarn heen liggen
        this._renderer.setStyle(sidebarPageElement, 'z-index', this._pages.length + 1);

        const contentComponent = sidebarComponent.instance.viewContainerRef.createComponent(componentType);
        const contentElement = getHTMLElement(contentComponent);

        let inputsRef: EffectRef | undefined;
        if (isSignal(inputs)) {
            inputsRef = effect(() => this.setInputs(contentComponent, inputs()), {
                injector: this._injector
            });
        } else {
            this.setInputs(contentComponent, inputs);
        }

        this._renderer.addClass(contentElement, 'in-sidebar');
        this._renderer.appendChild(sidebarPageComponent.instance.elementRef.nativeElement, contentElement);
        this._renderer.appendChild(sidebarComponent.instance.contentRef.nativeElement, sidebarPageElement);

        const previous = this._pages[this._pages.length - 1];
        if (previous) {
            sidebarPageComponent.instance.enableAnimation();
            enableBodyScroll(getHTMLElement(previous.pageRef));
        }
        disableBodyScroll(sidebarPageElement);

        const page: SidebarPageInformation = {
            contentComponentType: componentType,
            sidebarRef: sidebarComponent,
            settings,
            pageRef: sidebarPageComponent,
            effectRef: inputsRef
        };

        this._pages.push(page);

        const closeSidebarUtil: CloseSidebarUtil = {
            finalizeClose: (usingOnClose) => this.finalizeClose(page, usingOnClose),
            requestClose: (trigger) => this.requestClose(page, trigger),
            finalizeBack: () => this.finalizeBack(),
            requestBack: (trigger) => this.requestBack(page, trigger)
        };
        sidebarComponent.setInput('closeSidebarUtil', closeSidebarUtil);
        sidebarPageComponent.setInput('closeSidebarUtil', closeSidebarUtil);

        if (!this._sidebarRef) {
            this._renderer.appendChild(document.body, sidebarElement);
        }
        this._sidebarRef = sidebarComponent;

        return contentComponent.instance;
    }

    /**
     * A guard is a way to intercept the closing of the sidebar, for example to show a confirmation modal to the user.
     * The closing of the sidebar can come from different sources, and you can provide a list of triggers for the guard.
     */
    registerCloseGuard<T>(
        componentType: Type<T>,
        guard: SidebarCloseGuard,
        triggers: ReadonlyArray<SidebarCloseTrigger> = SidebarCloseTriggers
    ) {
        const pages = this._pages.filter((page) => page.contentComponentType === componentType);
        if (pages.length < 1) {
            throw new Error(`Could not find sidebar page for content component '${componentType}'`);
        } else if (pages.length > 1) {
            throw new Error(`Not supported: multiple pages of same content component '${componentType}'`);
        }
        const page = pages[0];
        page.closeGuard = { guard, triggers };
    }

    backWithAnimation() {
        if (this._pages.length > 1) {
            this.setSidebarPointerEvents('none');
            this._pages[this._pages.length - 2].pageRef.instance.elementRef.nativeElement.style.display = 'block';
            this._pages[this._pages.length - 1].pageRef.instance.animateAndClose();
        } else {
            this.back();
        }
    }

    back(): void {
        if (this._pages.length > 1) {
            this.setSidebarPointerEvents('auto');
            const currentPage = this._pages.pop();
            if (currentPage) {
                enableBodyScroll(getHTMLElement(currentPage.pageRef));
                currentPage?.settings.onClose?.();
                currentPage.pageRef.destroy();
            }
            const page = this._pages[this._pages.length - 1];
            disableBodyScroll(getHTMLElement(page.pageRef));
        } else {
            this.animateAndClose();
        }
    }

    onPageAdded(): void {
        if (this._pages.length > 1) {
            this._pages[this._pages.length - 2].pageRef.instance.elementRef.nativeElement.style.display = 'none';
        }

        this.setSidebarPointerEvents('auto');
    }

    animateAndClose(): void {
        this._sidebarRef?.instance.animateAndClose();
    }

    close(usingOnClose = true): void {
        if (!this._sidebarRef) return;

        this._accessibilityService.enableHomeComponentTabIndex();
        this._keyPressedService.setOverlayOff();

        Array.from(this._pages.values()).forEach((page) => {
            enableBodyScroll(getHTMLElement(page.pageRef));
            usingOnClose && page.settings.onClose?.();
            page.effectRef?.destroy();
        });

        // sidebar ref kan gesloten zijn door de page Onclose bij bv een router actie
        this._sidebarRef?.destroy();
        this._sidebarRef = undefined;
        this._pages = [];
    }

    setSidebarPointerEvents(autoOrNone: PointerEventType) {
        const sidebarComponent = this._sidebarRef;
        if (sidebarComponent) {
            const sidebarElement = getHTMLElement(sidebarComponent);
            sidebarElement.style.pointerEvents = autoOrNone;
        }
    }

    private requestClose(page: SidebarPageInformation, trigger: SidebarCloseTrigger): void {
        if (this.closingBlocked) return;
        if (page.closeGuard && page.closeGuard.triggers.includes(trigger)) {
            // we already have an active close guard - ignore close request
            if (this._pageWithActiveCloseGuard) {
                return;
            }
            this._pageWithActiveCloseGuard = page;
            page.closeGuard
                .guard()
                .pipe(
                    takeUntilDestroyed(this._destroyRef),
                    take(1),
                    finalize(() => (this._pageWithActiveCloseGuard = undefined))
                )
                .subscribe((confirmed) => confirmed && this.startClose(page, trigger));
        } else {
            this.startClose(page, trigger);
        }
    }

    private startClose(page: SidebarPageInformation, trigger: SidebarCloseTrigger) {
        if (SidebarCloseTriggersWithAnimations.includes(trigger)) {
            if (this.closingBlocked) return;
            this.closingBlocked = true;
            page.sidebarRef.instance.startSidebarCloseAnimation();
        } else {
            const usingOnClose = trigger !== 'navigation';
            this.finalizeClose(page, usingOnClose);
        }
    }

    private finalizeClose(page: SidebarPageInformation, usingOnClose: boolean): void {
        this.closingBlocked = false;
        this.close(usingOnClose);
    }

    private requestBack(page: SidebarPageInformation, trigger: SidebarCloseTrigger): void {
        if (this.closingBlocked) return;
        if (page.closeGuard && page.closeGuard.triggers.includes(trigger)) {
            // we already have an active close guard - ignore close request
            if (this._pageWithActiveCloseGuard) {
                return;
            }
            this._pageWithActiveCloseGuard = page;
            page.closeGuard
                .guard()
                .pipe(
                    takeUntilDestroyed(this._destroyRef),
                    finalize(() => (this._pageWithActiveCloseGuard = undefined))
                )
                .subscribe(() => this.startBack(page, trigger));
        } else {
            this.startBack(page, trigger);
        }
    }

    private startBack(page: SidebarPageInformation, trigger: SidebarCloseTrigger) {
        if (SidebarCloseTriggersWithAnimations.includes(trigger)) {
            if (this.closingBlocked) return;
            this.backWithAnimation();
        } else {
            this.finalizeBack();
        }
    }

    private finalizeBack(): void {
        this.back();
    }

    private setInputs<T>(componentRef: ComponentRef<T>, inputs: SignalInputs<T>) {
        Object.entries(inputs).forEach(([key, value]) => {
            componentRef.setInput(key, value);
        });
    }
}

const SidebarCloseTriggersWithAnimations: ReadonlyArray<SidebarCloseTrigger> = SidebarCloseTriggers.filter(
    (trigger) => trigger !== 'navigation'
);
