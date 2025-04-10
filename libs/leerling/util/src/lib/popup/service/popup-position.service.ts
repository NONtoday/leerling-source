import { Injectable } from '@angular/core';
import { PopupSettings } from '../popup-settings';
import { BoundingClientRect } from '../popup.modals';

@Injectable({
    providedIn: 'root'
})
export class PopupPositionService {
    public calculateTop(connectedRect: BoundingClientRect, popupRect: BoundingClientRect, settings: PopupSettings): number {
        const windowTop = window.scrollY;
        const windowBottom = windowTop + window.innerHeight;

        const connectedTop = connectedRect.top + window.scrollY;
        const connectedBottom = connectedTop + connectedRect.height;

        const elementOffset = settings.elementOffset ?? 0;

        const calculatedTopAbove = connectedTop - popupRect.height - elementOffset;
        const calculatedTopUnder = connectedBottom + elementOffset;

        const connectedCenter = connectedTop + connectedRect.height / 2;
        const centerOfPopup = popupRect.height / 2;
        const calculatedTopForCenterPopup = connectedCenter - centerOfPopup;

        const calculatedTopForEndPopup = connectedBottom - popupRect.height;

        switch (settings.position) {
            case 'above':
                if (calculatedTopAbove < windowTop) {
                    if (calculatedTopUnder + popupRect.height <= windowBottom) {
                        return calculatedTopUnder;
                    }
                }
                return calculatedTopAbove;
            case 'under':
                if (calculatedTopUnder + popupRect.height > windowBottom) {
                    if (calculatedTopAbove >= windowTop) {
                        return calculatedTopAbove;
                    }
                }
                return calculatedTopUnder;
            case 'left':
            case 'right':
                switch (settings.alignment) {
                    case 'start':
                        if (connectedTop + popupRect.height > windowBottom) {
                            if (this.fitsVerticalInWindow(calculatedTopForCenterPopup, windowTop, windowBottom, popupRect.height)) {
                                return calculatedTopForCenterPopup;
                            } else if (this.fitsVerticalInWindow(calculatedTopForEndPopup, windowTop, windowBottom, popupRect.height)) {
                                return calculatedTopForEndPopup;
                            }
                        }
                        return connectedTop;
                    case 'end':
                        if (connectedBottom - popupRect.height < windowTop) {
                            if (this.fitsVerticalInWindow(calculatedTopForCenterPopup, windowTop, windowBottom, popupRect.height)) {
                                return calculatedTopForCenterPopup;
                            } else if (this.fitsVerticalInWindow(connectedTop, windowTop, windowBottom, popupRect.height)) {
                                return connectedTop;
                            }
                        }
                        return calculatedTopForEndPopup;
                    case 'center': {
                        if (!this.fitsVerticalInWindow(calculatedTopForCenterPopup, windowTop, windowBottom, popupRect.height)) {
                            if (this.fitsVerticalInWindow(connectedTop, windowTop, windowBottom, popupRect.height)) {
                                return connectedTop;
                            } else if (this.fitsVerticalInWindow(calculatedTopForEndPopup, windowTop, windowBottom, popupRect.height)) {
                                return calculatedTopForEndPopup;
                            }
                        }
                        return calculatedTopForCenterPopup;
                    }
                }
        }
    }

    public calculateLeft(connectedRect: BoundingClientRect, popupRect: BoundingClientRect, settings: PopupSettings): number {
        const windowLeft = window.scrollX;
        const windowRight = windowLeft + window.innerWidth;

        const connectedLeft = connectedRect.left + window.scrollX;
        const connectedRight = connectedLeft + connectedRect.width;

        const elementOffset = settings.elementOffset ?? 0;

        const calculatedLeftStart = connectedLeft - popupRect.width - elementOffset;
        const calculatedLeftEnd = connectedRight + elementOffset;

        const connectedCenter = connectedLeft + connectedRect.width / 2;
        const centerOfPopup = popupRect.width / 2;
        const calculatedLeftForCenterPopup = connectedCenter - centerOfPopup;

        const calculatedLeftForEndPopup = connectedRight - popupRect.width;

        switch (settings.position) {
            case 'above':
            case 'under':
                switch (settings.alignment) {
                    case 'start':
                        if (connectedLeft + popupRect.width > windowRight) {
                            if (this.fitsHorizontalInWindow(calculatedLeftForCenterPopup, windowLeft, windowRight, popupRect.width)) {
                                return calculatedLeftForCenterPopup;
                            } else if (this.fitsHorizontalInWindow(calculatedLeftForEndPopup, windowLeft, windowRight, popupRect.width)) {
                                return calculatedLeftForEndPopup;
                            }
                        }
                        return connectedLeft;
                    case 'end':
                        if (connectedRight - popupRect.width < windowLeft) {
                            if (this.fitsHorizontalInWindow(calculatedLeftForCenterPopup, windowLeft, windowRight, popupRect.width)) {
                                return calculatedLeftForCenterPopup;
                            } else if (this.fitsHorizontalInWindow(connectedLeft, windowLeft, windowRight, popupRect.width)) {
                                return connectedLeft;
                            }
                        }
                        return calculatedLeftForEndPopup;
                    case 'center': {
                        if (!this.fitsVerticalInWindow(calculatedLeftForCenterPopup, windowLeft, windowRight, popupRect.width)) {
                            if (this.fitsHorizontalInWindow(connectedLeft, windowLeft, windowRight, popupRect.width)) {
                                return connectedLeft;
                            } else if (this.fitsHorizontalInWindow(calculatedLeftForEndPopup, windowLeft, windowRight, popupRect.width)) {
                                return calculatedLeftForEndPopup;
                            }
                        }
                        return calculatedLeftForCenterPopup;
                    }
                }
                break;
            case 'left':
                if (calculatedLeftStart < windowLeft) {
                    if (calculatedLeftEnd + popupRect.width <= windowRight) {
                        return calculatedLeftEnd;
                    }
                }
                return calculatedLeftStart;
            case 'right':
                if (calculatedLeftEnd + popupRect.width > windowRight) {
                    if (calculatedLeftStart >= windowLeft) {
                        return calculatedLeftStart;
                    }
                }
                return calculatedLeftEnd;
        }
    }

    private fitsVerticalInWindow(top: number, windowTop: number, windowBottom: number, popupHeight: number): boolean {
        return top >= windowTop && top + popupHeight <= windowBottom;
    }

    private fitsHorizontalInWindow(left: number, windowLeft: number, windowRight: number, popupWidth: number): boolean {
        return left >= windowLeft && left + popupWidth <= windowRight;
    }
}
