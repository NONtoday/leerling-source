import { DestroyRef, inject, Injectable, RendererFactory2 } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofActionCompleted, Store } from '@ngxs/store';
import { isBefore } from 'date-fns';
import {
    HARMONY_MODAL_COMPONENT_SELECTOR,
    HARMONY_TOAST_SELECTOR,
    HARMONY_TOOLTIP_SELECTOR,
    ModalService as HarmonyModalService,
    ToastComponent
} from 'harmony';
import {
    LandelijkeMededelingenSelectors,
    LandelijkeMededelingGelezen,
    RefreshLandelijkeMededelingen,
    SLandelijkeMededeling,
    SLandelijkeMededelingenAccountContext
} from 'leerling/store';
import { ActiveToast, IndividualConfig, ToastrService } from 'ngx-toastr';
import { debounceTime, fromEvent, map, merge, Observable, startWith, Subject, takeUntil } from 'rxjs';
import { MODAL_COMPONENT_SELECTOR } from '../../modalwindow/component/modal.component';
import { ModalService } from '../../modalwindow/service/modal.service';
import { SidebarService } from '../../sidebar/service/sidebar.service';
import { SIDEBAR_COMPONENT_SELECTOR } from '../../sidebar/sidebar.component';

export const MAX_XPATH_MESSAGES = 5;
export const SYSTEEMMELDING_SELECTOR = 'systeem-melding-';
export const OVERLAY_CONTAINER_SELECTOR = 'overlay-container';

export const toastConfig: Partial<IndividualConfig> = {
    // expliciet timeOut en extendedTimeout toegevoegd want disableTimout bleek niet te werken.
    timeOut: 0,
    extendedTimeOut: 0,
    tapToDismiss: true
};

export type SysteemMededelingSlot = {
    xPath: string;
    toast: ActiveToast<any>;
    toastElement: HTMLElement;
    toastContainer: HTMLElement;
};

@Injectable({
    providedIn: 'root'
})
export class LandelijkeMededelingenService {
    private _store = inject(Store);
    private _toastr = inject(ToastrService);
    private _destroyRef = inject(DestroyRef);
    private _actions$ = inject(Actions);
    private _renderer = inject(RendererFactory2).createRenderer(null, null);
    private _mutationObserver: MutationObserver;
    private _harmonyModalService = inject(HarmonyModalService);
    private _modalService = inject(ModalService);
    private _sidebarService = inject(SidebarService);

    private _systeemMededelingSlots: SysteemMededelingSlot[] | undefined[] = new Array(MAX_XPATH_MESSAGES).fill(undefined);
    private _activeToasts: ActiveToast<any>[] = [];
    private _huidigeMededelingen: SLandelijkeMededeling[] = [];

    constructor() {
        this._actions$
            .pipe(ofActionCompleted(RefreshLandelijkeMededelingen), takeUntilDestroyed())
            .subscribe(() => this.setupLandelijkeMededelingen());

        merge(fromEvent(window, 'scroll').pipe(startWith(null)), fromEvent(window, 'resize').pipe(startWith(null)))
            .pipe(debounceTime(10), takeUntilDestroyed())
            .subscribe(() => {
                this._refreshMededelingenInView();
            });
    }

    public getCurrentAccountLandelijkeMededelingen(): Observable<SLandelijkeMededelingenAccountContext | undefined> {
        return this._store.select(LandelijkeMededelingenSelectors.getCurrentAccountLandelijkeMededelingen());
    }

    public markeerLandelijkeMededelingAlsGelezen(mededelingId: number): void {
        this._store.dispatch(new LandelijkeMededelingGelezen(mededelingId));
    }

    public refreshLandelijkeMededelingen() {
        this._store.dispatch(new RefreshLandelijkeMededelingen());
    }

    public setupLandelijkeMededelingen() {
        this.getCurrentAccountLandelijkeMededelingen()
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                map(
                    (account) =>
                        account?.mededelingen?.filter(
                            (mededeling) => !mededeling.isGelezen && !isBefore(mededeling.eindPublicatie, new Date())
                        ) || []
                )
            )
            .subscribe((mededelingen) => {
                this._huidigeMededelingen = mededelingen;
                this._refreshMededelingenInView();
            });
        this._observeDOM();
    }

    private _refreshMededelingenInView() {
        // wanneer een toast in de DOM is blijven staan wordt deze niet nogmaals toegevoegd.
        this._huidigeMededelingen.forEach((mededeling) => {
            const hasActiveToast = this._activeToasts.find((toast) => toast.message === mededeling.inhoud);
            if (hasActiveToast) {
                const slotIndex = this._systeemMededelingSlots.findIndex((slot) => slot?.xPath === mededeling.xpath);
                if (slotIndex === -1) return;

                const slot = this._systeemMededelingSlots[slotIndex];
                const isPositioned = this._positionToastContainer(slot);

                if (!isPositioned && slot?.toast) {
                    this._removeToast(slot.toast, slotIndex);
                }
            } else {
                switch (mededeling.notificatieType) {
                    case 'Notificatie':
                    case 'Schermvullend':
                        this._addToast(mededeling, toastConfig);
                        break;
                    case 'ItemMarkering':
                        this._addXPathToast(mededeling);
                        break;
                }
            }
        });
        this._setupOnTapEvents();
    }

    private _observeDOM(): void {
        // Deze obeserveert tevens routechanges omdat daar altijd domchanges in voorkomen
        const targetNode = document.body;
        this._mutationObserver = new MutationObserver((mutationsList) => {
            const moetUitvoeren =
                mutationsList.filter((mutations) =>
                    [...Array.from(mutations.addedNodes), ...Array.from(mutations.removedNodes)].filter(
                        (node) =>
                            node.nodeName.toLowerCase() !== HARMONY_TOOLTIP_SELECTOR &&
                            node.nodeName.toLowerCase() !== HARMONY_TOAST_SELECTOR &&
                            !(node as Element)?.classList?.contains(OVERLAY_CONTAINER_SELECTOR) &&
                            !(node as Element)?.classList?.contains(SYSTEEMMELDING_SELECTOR)
                    )
                ).length > 0;
            if (!moetUitvoeren) return;

            this._refreshMededelingenInView();
        });

        this._mutationObserver.observe(targetNode, {
            childList: true,
            subtree: true
        });
    }

    private _removeToast(toast: ActiveToast<any>, slotIndex: number) {
        if (slotIndex !== -1) {
            this._systeemMededelingSlots[slotIndex] = undefined;
        }

        this._toastr.remove(toast.toastId);
        this._resetToastDestroy(toast);
        const index = this._activeToasts.indexOf(toast);
        this._activeToasts.splice(index, 1);
    }

    private _setupOnTapEvents() {
        this._activeToasts.forEach((toast) => {
            // Om er zeker van te zijn dat er geen meerdere listeners zijn
            this._resetToastDestroy(toast);

            const destroy$ = new Subject<void>();

            toast.onTap
                .pipe(
                    takeUntil(destroy$),
                    map(() => {
                        const mededeling = this._huidigeMededelingen.find((mededeling) => mededeling.inhoud === toast.message);
                        if (mededeling) this.markeerLandelijkeMededelingAlsGelezen(mededeling.id);
                    })
                )
                .subscribe();

            (toast as any).destroy$ = destroy$;
        });
    }

    private _resetToastDestroy(toast: ActiveToast<any>) {
        if ((toast as any).destroy$) {
            (toast as any).destroy$.next();
            (toast as any).destroy$.complete();
        }
    }

    private _addToast(mededeling: SLandelijkeMededeling, config?: Partial<IndividualConfig>): ActiveToast<any> {
        let toast: ActiveToast<any>;
        switch (mededeling.notificatieNiveau) {
            case 'info':
                toast = this._toastr.info(mededeling.inhoud, mededeling.onderwerp, config);
                break;
            case 'success':
                toast = this._toastr.success(mededeling.inhoud, mededeling.onderwerp, config);
                break;
            case 'error':
                toast = this._toastr.error(mededeling.inhoud, mededeling.onderwerp, config);
                break;
            case 'warning':
                toast = this._toastr.warning(mededeling.inhoud, mededeling.onderwerp, config);
                break;
        }

        this._activeToasts.push(toast);
        return toast;
    }

    private _addXPathToast(mededeling: SLandelijkeMededeling): ActiveToast<any> | undefined {
        const index = this._systeemMededelingSlots.findIndex((slot) => slot === undefined);
        if (index === -1) {
            // geen slots meer beschikbaar, toon de toast zonder xpath referentie
            return this._addToast(mededeling, toastConfig);
        }

        const element = this._evaluateXPath(mededeling.xpath);
        if (!element) return;

        const existingSlotIndex = this._systeemMededelingSlots.findIndex((slot) => slot?.xPath === mededeling.xpath);
        const isFoundInSlot = existingSlotIndex !== -1;

        const xPathToastConfig: Partial<IndividualConfig> = {
            ...toastConfig,
            positionClass: `${SYSTEEMMELDING_SELECTOR}${isFoundInSlot ? existingSlotIndex : index}`
        };

        // wanneer er al een slot is gevonden met deze mededeling voeg dan een nieuwe toast toe aan de container die al bestaat
        if (isFoundInSlot) return this._addToast(mededeling, xPathToastConfig);

        const toast = this._addToast(mededeling, xPathToastConfig);
        const toastComponent = toast.toastRef.componentInstance as ToastComponent;
        const toastElement = toastComponent.elementRef.nativeElement as HTMLElement;

        const container = document.querySelector(`.${SYSTEEMMELDING_SELECTOR}${index}`) as HTMLElement;
        if (!container) {
            return this._addToast(mededeling, toastConfig);
        }

        this._systeemMededelingSlots[index] = {
            xPath: mededeling.xpath,
            toast: toast,
            toastElement: toastElement,
            toastContainer: container
        } as SysteemMededelingSlot;

        this._positionToastContainer(this._systeemMededelingSlots[index]);

        return toast;
    }

    private _positionToastContainer(systeemMededelingSlot: SysteemMededelingSlot | undefined): boolean {
        if (!systeemMededelingSlot) return false;

        const element = this._evaluateXPath(systeemMededelingSlot.xPath);
        if (!element) return false;

        const elementRect = element.getBoundingClientRect();
        const toastRect = systeemMededelingSlot.toastElement.getBoundingClientRect();
        const container = systeemMededelingSlot.toastContainer;

        const top = this._calculateTop(elementRect, toastRect);
        const left = this._calculateLeft(elementRect, toastRect);

        this._renderer.setStyle(container, 'top', `${top}px`);
        this._renderer.setStyle(container, 'left', `${left}px`);
        this._renderer.setStyle(container, 'display', this._isElementInViewport(elementRect) ? 'block' : 'none');

        const isModalOrSidebarOpen =
            this._sidebarService.isSidebarOpen() || this._modalService.isOpen() || this._harmonyModalService.isOpen();

        if (isModalOrSidebarOpen) {
            const modalElement = document.querySelector(MODAL_COMPONENT_SELECTOR);
            const harmonyModalElement = document.querySelector(HARMONY_MODAL_COMPONENT_SELECTOR);
            const sidebarElement = document.querySelector(SIDEBAR_COMPONENT_SELECTOR);

            const relevantElements = [modalElement, harmonyModalElement, sidebarElement].filter(Boolean);

            if (relevantElements.length > 0) {
                const targetElement = this._evaluateXPath(systeemMededelingSlot.xPath);

                if (targetElement) {
                    const isInRelevantElement = relevantElements.some((el) => el?.contains(targetElement));

                    if (isInRelevantElement) {
                        this._renderer.addClass(container, 'elevated');
                    }
                }
            }
        }

        return true;
    }

    private _evaluateXPath(xpath: string | undefined): HTMLElement | undefined {
        if (!xpath) return;

        const evaluator = new XPathEvaluator();
        const result = evaluator.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);

        const node = result.singleNodeValue;
        return node ? (node as HTMLElement) : undefined;
    }

    private _calculateTop(elementRect: DOMRect, toastRect: DOMRect): number {
        const elementOffsetHeight = 4;
        const clientHeight = document.documentElement.clientHeight;
        const isAboveMiddle = elementRect.top < clientHeight / 2;

        return isAboveMiddle ? elementRect.bottom + elementOffsetHeight : elementRect.top - elementOffsetHeight - toastRect.height;
    }

    private _calculateLeft(elementRect: DOMRect, toastRect: DOMRect): number {
        const elementOffsetWidth = 32;
        const clientWidth = document.documentElement.clientWidth;
        const scrollbarWidth = window.innerWidth - clientWidth;

        const isLeftOfMiddle = elementRect.left < clientWidth / 2;
        const left = isLeftOfMiddle ? elementRect.left : elementRect.right - scrollbarWidth - elementOffsetWidth - toastRect.width;

        return left > 0 ? left : 0;
    }

    private _isElementInViewport(elementRect: DOMRect) {
        return (
            elementRect.top >= 0 &&
            elementRect.left >= 0 &&
            elementRect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            elementRect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}
