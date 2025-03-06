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
import { Tabbable } from '../../tabbable.interface';
import { isCurrentUrlInitialUrl } from '../../url-util';
import { CloseSidebarUtil, SidebarCloseGuard, SidebarCloseTrigger, SidebarCloseTriggers } from '../sidebar-model';
import { SidebarSettings } from '../sidebar-settings';
import { SidebarComponent } from '../sidebar.component';

export interface SidebarPageInformation {
    closeGuard?: {
        guard: SidebarCloseGuard;
        triggers: ReadonlyArray<SidebarCloseTrigger>;
    };
    contentComponentType: Type<unknown>;
    contentComponent: ComponentRef<any>;
    pageRef: ComponentRef<SidebarPageComponent>;
    sidebarRef: ComponentRef<SidebarComponent>;
    settings: SidebarSettings;
    effectRef?: EffectRef;
    afterClose?: (closeTrigger: SidebarCloseTrigger) => void;
}

export type PointerEventType = 'auto' | 'none';

@Injectable({
    providedIn: 'root'
})
export class SidebarService {
    private _keyPressedService = inject(KeyPressedService);
    private _accessibilityService = inject(AccessibilityService);
    private _rendererFactory = inject(RendererFactory2);
    private _renderer: Renderer2;
    private _sidebarRef: ComponentRef<SidebarComponent> | undefined;
    private _destroyRef = inject(DestroyRef);

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

    push<T>(
        componentType: Type<T>,
        inputs: SignalInputs<T> | Signal<SignalInputs<T>>,
        settings: SidebarSettings,
        afterClose?: (closeTrigger: SidebarCloseTrigger) => void
    ): T {
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
        sidebarPageComponent.setInput('headerDevice', settings.headerDevice);
        sidebarPageComponent.setInput('headerType', settings.headerType);
        sidebarPageComponent.setInput('iconLeft', settings.iconLeft);
        sidebarPageComponent.setInput('iconsRight', settings.iconsRight);
        sidebarPageComponent.setInput('titleIcon', settings.titleIcon);
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
            contentComponent: contentComponent,
            sidebarRef: sidebarComponent,
            settings,
            pageRef: sidebarPageComponent,
            effectRef: inputsRef,
            afterClose: afterClose
        };

        this._pages.push(page);

        const closeSidebarUtil: CloseSidebarUtil = {
            finalizeClose: (usingOnClose, trigger) => this.finalizeClose(page, usingOnClose, trigger),
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

    isSidebarOpen(): boolean {
        return this._pages.length > 0;
    }

    requestBackNavigation() {
        if (!this.isSidebarOpen()) return;

        const tabbable = this.getCurrentPageAsTabblabeOrUndefined();
        if (tabbable && tabbable.canGoTabBack()) {
            tabbable.tabBack();
        } else {
            this.requestBack(this._pages[this._pages.length - 1], 'page-back');
        }
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
                currentPage?.settings.onClose?.('page-back');
                currentPage.pageRef.destroy();
            }
            const page = this._pages[this._pages.length - 1];
            disableBodyScroll(getHTMLElement(page.pageRef));
        } else {
            this.animateAndClose();
        }
    }

    private getCurrentPageAsTabblabeOrUndefined(): Tabbable | undefined {
        if (this._pages.length === 0) return undefined;

        const tabblable = this._pages[this._pages.length - 1].contentComponent.instance as Tabbable;
        if (tabblable?.tabBack !== undefined) {
            return tabblable;
        }

        return undefined;
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

    close(usingOnClose = true, closeTrigger: SidebarCloseTrigger): void {
        if (!this._sidebarRef) return;

        this._accessibilityService.enableHomeComponentTabIndex();
        this._keyPressedService.setOverlayOff();

        const pages = Array.from(this._pages.values());
        pages.forEach((page) => {
            enableBodyScroll(getHTMLElement(page.pageRef));
            if (usingOnClose) page.settings.onClose?.(closeTrigger);
            page.effectRef?.destroy();
        });

        const firstSidebar = pages[0];

        // sidebar ref kan gesloten zijn door de page Onclose bij bv een router actie
        this._sidebarRef?.destroy();
        this._sidebarRef = undefined;
        this._pages = [];

        pages.forEach((page) => {
            if (page.afterClose) {
                page.afterClose(closeTrigger);
            }
        });

        // Indien we een bookmarkable URL hebben en we sluiten de sidebar,
        // dan gaan we in de history back, zodat de history stack ook weer klopt.
        if (closeTrigger !== 'navigation' && firstSidebar.settings.hasBookmarkableUrl && !isCurrentUrlInitialUrl()) {
            window.history.back();
        }
    }

    setSidebarPointerEvents(autoOrNone: PointerEventType) {
        const sidebarComponent = this._sidebarRef;
        if (sidebarComponent) {
            const sidebarElement = getHTMLElement(sidebarComponent);
            sidebarElement.style.pointerEvents = autoOrNone;
        }
    }

    getSidebarComponent<T>(componentType: Type<T>): T | undefined {
        return this.getSidebarComponentRef(componentType)?.instance as T;
    }

    private getSidebarComponentRef<T>(componentType: Type<T>): ComponentRef<T> | undefined {
        const page = this._pages.find((page) => page.contentComponentType === componentType);
        return page?.contentComponent as ComponentRef<T>;
    }

    private requestClose(page: SidebarPageInformation, trigger: SidebarCloseTrigger): void {
        this.handleCloseOrBackRequest(page, trigger);
    }

    private requestBack(page: SidebarPageInformation, trigger: SidebarCloseTrigger): void {
        this.handleCloseOrBackRequest(page, trigger, true);
    }

    private handleCloseOrBackRequest(page: SidebarPageInformation, trigger: SidebarCloseTrigger, requestBack = false): void {
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
                .subscribe((confirmed) => confirmed && (requestBack ? this.startBack(page, trigger) : this.startClose(page, trigger)));
        } else {
            if (requestBack) this.startBack(page, trigger);
            else this.startClose(page, trigger);
        }
    }

    private startClose(page: SidebarPageInformation, trigger: SidebarCloseTrigger): void {
        if (SidebarCloseTriggersWithAnimations.includes(trigger)) {
            if (this.closingBlocked) return;
            this.closingBlocked = true;
            page.sidebarRef.instance.startSidebarCloseAnimation();
        } else {
            const usingOnClose = trigger !== 'navigation';
            this.finalizeClose(page, usingOnClose, trigger);
        }
    }

    private finalizeClose(page: SidebarPageInformation, usingOnClose: boolean, closeTrigger: SidebarCloseTrigger): void {
        this.closingBlocked = false;
        this.close(usingOnClose, closeTrigger);
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

    public updateInputs<T>(componentType: Type<T>, inputs: SignalInputs<T>) {
        const component = this.getSidebarComponentRef(componentType);
        if (component) {
            this.setInputs(component, inputs);
        }
    }
}

const SidebarCloseTriggersWithAnimations: ReadonlyArray<SidebarCloseTrigger> = SidebarCloseTriggers.filter(
    (trigger) => trigger !== 'navigation'
);
