import {
    ComponentRef,
    Directive,
    ElementRef,
    HostListener,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    Renderer2,
    SecurityContext,
    SimpleChanges,
    TemplateRef,
    ViewContainerRef
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { isFunction } from 'lodash-es';
import { fromEvent } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { match } from 'ts-pattern';
import { Optional } from '../../optional/optional';
import { DeviceService } from '../../services/device.service';
import { harmonyTooltipSelector, TooltipComponent } from './tooltip.component';

/**
 * The timeout in ms between layout updates for the tooltip.
 * Prevents updates from happening too frequently and causing issues.
 */
const UPDATE_TIMEOUT = 50;

// tooltip component wordt niet direct geexporteerd vanuit harmony
export const HARMONY_TOOLTIP_SELECTOR = harmonyTooltipSelector;

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

const flipPosition = (position: TooltipPosition) =>
    match(position)
        .returnType<TooltipPosition>()
        .with('top', () => 'bottom')
        .with('bottom', () => 'top')
        .with('left', () => 'right')
        .with('right', () => 'left')
        .exhaustive();

@Directive({
    selector: '[hmyTooltip]',
    standalone: true
})
export class TooltipDirective implements OnChanges, OnDestroy {
    private _elementRef = inject(ElementRef);
    private _renderer = inject(Renderer2);
    private _deviceService = inject(DeviceService);
    private _router = inject(Router);
    private _sanitizer = inject(DomSanitizer);
    private _viewcontainerRef = inject(ViewContainerRef);

    private get _nativeElement(): HTMLElement {
        return this._elementRef.nativeElement;
    }

    // The content of the hint.
    private _tooltipComponentRef: Optional<ComponentRef<TooltipComponent>>;

    private get _tooltipNativeElement(): Optional<HTMLElement> {
        return this._tooltipComponentRef?.location.nativeElement;
    }

    // The value for paddingLeft and paddingRight inside content.
    private _horizontalPadding = 16;

    // The value for paddingTop and paddingBottom inside content.
    private _verticalPadding = 8;

    // The offset from the left side of the clients window including the width of the menu.
    private _windowOffsetLeft = 8;

    // The offset from the edges of the clients window, for the leftOffset see windowOffsetLeft.
    private _windowOffset = 8;

    // The minimal width of the tooltip, this includes the width of the padding.
    private _minWidth = 44;

    // A copy of the value set to maxWidth. This will be used in all logic and can be overridden to fit on screen.
    private _maxWidth: number;

    // The height of the page which is equal to the height of the body element in the DOM.
    private _pageHeight: number;

    private _isOpenedOnTouch: boolean;

    // Tracks whether an update is in progress to ensure resize updates do not overlap.
    private _isUpdating = false;

    // When a tooltip does not fit on screen, an attempt is first made to flip its position (e.g. 'top' becomes 'bottom') before it is definitively decided it does not fit.
    // This variable tracks whether that has been attempted already.
    private _positionFlipped = false;

    // The textual hint to be displayed.
    @Input() hmyTooltip: Optional<string> | (() => Optional<string>) | TemplateRef<any>;

    private get _value(): Optional<TemplateRef<any> | string> {
        return isFunction(this.hmyTooltip) ? this.hmyTooltip() : this.hmyTooltip;
    }

    // Displayed position of the hint.
    @Input() position: TooltipPosition = 'top';

    // Function to determine the position.
    // Default value 'top' is returned when the value set for position is invalid.
    private getPosition() {
        const position = this.position;
        if (position === 'left' || position === 'right' || position === 'bottom') {
            return position;
        } else {
            return 'top';
        }
    }

    // Maximum width of the hint. Exceeding width will be displayed on multiple rows.
    @Input() maxWidth = 212;

    // The input value set to 'maxWidth' in the HTML can be interpreted as a string even though the type is number.
    // To make sure '_maxWidth' is an integer the value of 'maxWidth' is parsed to an integer.
    // The function 'parseInt' only accepts a string as input and therefore 'maxWidth' is converted to a string first.
    private parseMaxWidthValue() {
        return parseInt(String(this.maxWidth), 10);
    }

    // Indication whether the tooltip should be displayed.
    @Input() tooltipDisplayable: Optional<boolean> = true;

    @Input() onTouchAllowed: Optional<boolean> = false;

    // The delay in milliseconds before which the tooltip should be displayed
    @Input() tooltipDisplayDelay = 500;

    @Input() alignCenter: Optional<boolean> = true;

    @Input() preventClickOnTouch: Optional<boolean> = true;

    // The tooltips offset towards the targeted element.
    @Input() elementOffset = 4;

    // Flag to only show tooltip if the width of element is smaller than the content of the tooltip
    // i.e. show only the name of the student if the name is ellipsed.
    @Input() showIfEllipsed = false;

    /**
     * Use legacy rendering for the tooltip, where the innerHTML of the tooltip is replaced by the (sanitized) input string.
     *
     * @deprecated We no longer want to sanitize the content of tooltips. Use a template instead!
     */
    @Input() useLegacyRendering = false;

    private get _hasValue(): boolean {
        const value = this._value;
        if (!value) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        return true;
    }

    @HostListener('mouseenter', ['$event'])
    onMouseEnter(event: any) {
        if (!event?.sourceCapabilities?.firesTouchEvents && !this._tooltipComponentRef && this.isDisplayable()) {
            this.setup();
        }
    }

    @HostListener('touchend', ['$event'])
    onTouchEnd(event: any) {
        if (this.onTouchAllowed && this.isDisplayable()) {
            this._isOpenedOnTouch = true;
            this.setup();

            // Als er een tooltip is op touch, dan is het normale clickgedrag van het element of diens parent niet gewenst.
            // Anders kun je de tooltip niet zien, doordat je bijv. al wegnavigeert.
            if (this.preventClickOnTouch) {
                event.preventDefault();
            }
        }
    }

    @HostListener('mouseleave')
    @HostListener('click')
    onMouseLeave() {
        if (!this._isOpenedOnTouch) {
            this.destroy();
        }
    }

    @HostListener('window.resize')
    onresize() {
        if (this._tooltipComponentRef) {
            this.update();
        }
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (this._tooltipComponentRef && changes['hmyTooltip'].currentValue !== changes['hmyTooltip'].previousValue) {
            const value = this._value;
            this._tooltipComponentRef.setInput('content', value);
            this._tooltipComponentRef.setInput('useLegacyRendering', this.useLegacyRendering && typeof value === 'string');
            this._tooltipComponentRef.changeDetectorRef.detectChanges();
            // FIXME: delete after all HTML-formatted string tooltips are gone
            this.useLegacyRenderingIfNeeded();
        }
    }

    public ngOnDestroy(): void {
        this.destroy();
    }

    public isDisplayable(): boolean {
        const showAlwaysOrEllipsed = !this.showIfEllipsed || this._nativeElement.scrollWidth > this._nativeElement.clientWidth;
        // Explicit check needed because the input could be a string.
        return showAlwaysOrEllipsed && this._hasValue && this.tooltipDisplayable?.toString() === 'true';
    }

    // FIXME: legacy rendering should be removed once all tooltips with HTML content are made using templates.
    private useLegacyRenderingIfNeeded() {
        if (this.useLegacyRendering) {
            const value = this._value;
            if (typeof value === 'string') {
                this._renderer.setProperty(
                    this._tooltipNativeElement,
                    'innerHTML',
                    value ? this._sanitizer.sanitize(SecurityContext.HTML, value) : ''
                );
            }
        }
    }

    private setup() {
        this._maxWidth = this.parseMaxWidthValue();
        this._pageHeight = document.body.scrollHeight;

        // Update the offset so the tooltip doesn't cover the menu.
        if (!this._deviceService.isPhone) {
            this._windowOffsetLeft = 75;
        }

        this.createContent();
        // FIXME: delete after all HTML-formatted string tooltips are gone
        this.useLegacyRenderingIfNeeded();
        this._renderer.addClass(this._nativeElement, 'tooltip-open');

        this._router.events
            .pipe(
                filter((event) => event instanceof NavigationStart || event instanceof NavigationEnd),
                take(1)
            )
            .subscribe(() => {
                this.destroy();
            });

        setTimeout(() => {
            if (this._tooltipComponentRef) {
                this.update();
            }
        });
    }

    private createContent() {
        const value = this._value;
        this._tooltipComponentRef = this._viewcontainerRef.createComponent(TooltipComponent);
        this._tooltipComponentRef.setInput('content', value);
        this._tooltipComponentRef.setInput('useLegacyRendering', this.useLegacyRendering && typeof value === 'string');
        this._tooltipComponentRef.setInput('alignCenter', this.alignCenter);
        this._tooltipComponentRef.setInput('visible', false);
        this._tooltipComponentRef.setInput('horizontalPadding', this._horizontalPadding);
        this._tooltipComponentRef.setInput('verticalPadding', this._verticalPadding);
        this._tooltipComponentRef.setInput('top', 0);
        this._tooltipComponentRef.setInput('left', 0);
        this._tooltipComponentRef.setInput('maxWidth', this._maxWidth);
        this._tooltipComponentRef.changeDetectorRef.detectChanges();

        this._tooltipComponentRef.instance.onResize.subscribe(() => {
            // Prevents "ResizeObserver loop completed with undelivered notifications." errors.
            requestAnimationFrame(() => {
                // Do not overlap updates or update when the tooltip has been destroyed.
                if (!this._tooltipComponentRef || !this._tooltipNativeElement || this._isUpdating) return;
                this.update();
            });
        });

        this._renderer.appendChild(document.body, this._tooltipNativeElement);
    }

    /**
     * Remove hint from the dom and set all created elements to null.
     */
    private destroy() {
        if (this._tooltipComponentRef) {
            this._renderer.removeChild(document.body, this._tooltipNativeElement);
            this._tooltipComponentRef.destroy();
        }
        this._tooltipComponentRef = null;
        this._renderer.removeClass(this._nativeElement, 'tooltip-open');
    }

    /**
     * Triggers an upate of the tooltip's position and size.
     * Does not perform the update if an update is already in progress.
     */
    private update() {
        if (this._isUpdating) return;
        this._isUpdating = true;
        this.doUpdate();
        // Set a timeout for future updates to prevent rapid fire updates causing flickering.
        setTimeout(() => {
            this._isUpdating = false;
        }, UPDATE_TIMEOUT);
    }

    /**
     * The inner logic for performing an update.
     * Does not check whether an update is already in progress, allowing for recursive updating.
     *
     * Should not be called directly from code not part of the update itself.
     */
    private doUpdate() {
        if (!this._tooltipComponentRef || !this._tooltipNativeElement) {
            console.error('Tooltip element does not exist');
            return;
        }

        const position = this.getPosition();
        this._tooltipComponentRef.setInput('maxWidth', this._maxWidth);
        this._tooltipComponentRef.changeDetectorRef.detectChanges();

        if (position === 'top') {
            this.updateTop();
        } else if (position === 'bottom') {
            this.updateBottom();
        } else if (position === 'left') {
            this.updateLeft();
        } else if (position === 'right') {
            this.updateRight();
        }
    }

    /**
     *  Update styling for the hint displayed on the top.
     */
    private updateTop() {
        if (!this._tooltipComponentRef || !this._tooltipNativeElement) {
            console.error('Tooltip element does not exist');
            return;
        }

        this.updateHorizontal();
        const tooltipHeight = this._tooltipNativeElement.getBoundingClientRect().height;
        const elementBounds = this._nativeElement.getBoundingClientRect();
        const tooltipBottom = elementBounds.top - this.elementOffset;

        this._tooltipComponentRef.setInput('top', window.scrollY + tooltipBottom - tooltipHeight);
        this._tooltipComponentRef.changeDetectorRef.detectChanges();
        this.fitHorizontalWithinBounds();
    }

    /**
     * Update styling for the hint displayed on the bottom.
     */
    private updateBottom() {
        if (!this._tooltipComponentRef || !this._tooltipNativeElement) {
            console.error('Tooltip element does not exist');
            return;
        }

        this.updateHorizontal();
        const elementBounds = this._nativeElement.getBoundingClientRect();
        const tooltipTop = elementBounds.bottom + this.elementOffset;

        this._tooltipComponentRef.setInput('top', window.scrollY + tooltipTop);
        this._tooltipComponentRef.changeDetectorRef.detectChanges();

        this.fitHorizontalWithinBounds();
    }

    /**
     * Update all styling for the hint displayed on the top or the bottom.
     */
    private updateHorizontal() {
        if (!this._tooltipComponentRef || !this._tooltipNativeElement) {
            console.error('Tooltip element does not exist');
            return;
        }

        const tooltipWidth = this._tooltipNativeElement.getBoundingClientRect().width;
        const elementBounds = this._nativeElement.getBoundingClientRect();
        const elementCenter = elementBounds.left + elementBounds.width / 2;

        this._tooltipComponentRef.setInput('left', window.scrollX + elementCenter - tooltipWidth / 2);
        this._tooltipComponentRef.changeDetectorRef.detectChanges();
    }

    private updateLeft() {
        if (!this._tooltipComponentRef || !this._tooltipNativeElement) {
            console.error('Tooltip element does not exist');
            return;
        }

        this.updateVertical();
        const tooltipWidth = this._tooltipNativeElement.getBoundingClientRect().width;
        const elementBounds = this._nativeElement.getBoundingClientRect();
        const tooltipRight = elementBounds.left - this.elementOffset;

        this._tooltipComponentRef.setInput('left', window.scrollX + tooltipRight - tooltipWidth);
        this._tooltipComponentRef.changeDetectorRef.detectChanges();
        this.fitVerticalWithinBounds();
    }

    private updateRight() {
        if (!this._tooltipComponentRef || !this._tooltipNativeElement) {
            console.error('Tooltip element does not exist');
            return;
        }

        this.updateVertical();
        const elementBounds = this._nativeElement.getBoundingClientRect();
        const tooltipLeft = elementBounds.right + this.elementOffset;

        this._tooltipComponentRef.setInput('left', window.scrollX + tooltipLeft);
        this._tooltipComponentRef.changeDetectorRef.detectChanges();
        this.fitVerticalWithinBounds();
    }

    private updateVertical() {
        if (!this._tooltipComponentRef || !this._tooltipNativeElement) {
            console.error('Tooltip element does not exist');
            return;
        }

        const tooltipHeight = this._tooltipNativeElement.getBoundingClientRect().height;
        const elementBounds = this._nativeElement.getBoundingClientRect();
        const elementCenter = elementBounds.top + elementBounds.height / 2;

        this._tooltipComponentRef.setInput('top', window.scrollY + elementCenter - tooltipHeight / 2);
        this._tooltipComponentRef.changeDetectorRef.detectChanges();
    }

    /**
     * Update the contents position to fit within the bounds of the client's window.
     */
    private fitHorizontalWithinBounds() {
        if (!this._tooltipComponentRef || !this._tooltipNativeElement) {
            console.error('Tooltip element does not exist');
            return;
        }

        const tooltipBounds = this._tooltipNativeElement.getBoundingClientRect();
        let tooltipLeft = tooltipBounds.left;
        const tooltipRight = tooltipBounds.right;
        const tooltipWidth = tooltipBounds.width;
        const tooltipHeight = tooltipBounds.height;
        const tooltipTop = tooltipBounds.top + window.scrollY;
        const tooltipBottom = tooltipBounds.bottom + window.scrollY;

        const horizontalMin = this._windowOffsetLeft;
        const horizontalMax = window.innerWidth - this._windowOffset;
        const verticalMin = this._windowOffset;
        const verticalMax = this._pageHeight - this._windowOffset;

        if (this.getPosition() === 'top' && tooltipTop < verticalMin) {
            this.increaseMaxWidth();
        } else if (this.getPosition() === 'bottom' && tooltipBottom > verticalMax) {
            this.increaseMaxWidth();
        } else if (tooltipLeft < horizontalMin && tooltipRight > horizontalMax) {
            this.shrinkMaxWidth();
        } else if (tooltipLeft < horizontalMin) {
            const diff = horizontalMin - tooltipLeft;
            if (tooltipRight + diff < horizontalMax) {
                this._tooltipComponentRef.setInput('left', window.scrollX + tooltipLeft + diff);
                this._tooltipComponentRef.changeDetectorRef.detectChanges();
                this.show();
            } else {
                this.shrinkMaxWidth();
            }
        } else if (tooltipRight > horizontalMax) {
            let diff = tooltipRight - horizontalMax;
            if (tooltipWidth < this._maxWidth) {
                diff += this._maxWidth - tooltipWidth;
            }

            if (tooltipLeft - diff > horizontalMin) {
                // Determine and set contentLeft
                tooltipLeft -= diff;
                this._tooltipComponentRef.setInput('left', window.scrollX + tooltipLeft);
                this._tooltipComponentRef.changeDetectorRef.detectChanges();

                // Calculate new contentBounds
                const newBounds = this._tooltipNativeElement.getBoundingClientRect();
                const newWidth = newBounds.width;
                const newHeight = newBounds.height;

                // Add correction to the left when the hint is displayed on the right side on the screen.
                // We need to draw this from RtL instead of the default LtR.
                if (newWidth < this._maxWidth) {
                    tooltipLeft += this._maxWidth - newWidth;
                    this._tooltipComponentRef.setInput('left', window.scrollX + tooltipLeft);
                    this._tooltipComponentRef.changeDetectorRef.detectChanges();
                }
                // Add a correction to the top when the hint is displayed anywhere but below the host element.
                // Elements are anchored at the top so this new size does not affect the position of a hint below an element.
                if (this.getPosition() !== 'bottom' && newHeight < tooltipHeight) {
                    this._tooltipComponentRef.setInput('top', window.scrollY + tooltipBounds.top + tooltipHeight - newHeight);
                    this._tooltipComponentRef.changeDetectorRef.detectChanges();
                }
                this.show();
            } else {
                this.shrinkMaxWidth();
            }
        } else {
            this.show();
        }
    }

    private show() {
        if (this._isOpenedOnTouch) {
            if (this._tooltipComponentRef) {
                this._tooltipComponentRef.setInput('visible', true);
                this._tooltipComponentRef.changeDetectorRef.detectChanges();
            }
            fromEvent(window, 'touchstart')
                .pipe(take(1))
                .subscribe(() => {
                    this.destroy();
                });
        } else {
            setTimeout(() => {
                if (this._tooltipComponentRef) {
                    this._tooltipComponentRef.setInput('visible', true);
                    this._tooltipComponentRef.changeDetectorRef.detectChanges();
                }
            }, this.tooltipDisplayDelay);
        }
    }

    private fitVerticalWithinBounds() {
        if (!this._tooltipComponentRef || !this._tooltipNativeElement) {
            console.error('Tooltip element does not exist');
            return;
        }

        const tooltipBounds = this._tooltipNativeElement.getBoundingClientRect();
        const tooltipLeft = tooltipBounds.left;
        const tooltipRight = tooltipBounds.right;
        const tooltipTop = tooltipBounds.top + window.scrollY;
        const contentBottom = tooltipBounds.bottom + window.scrollY;

        const horizontalMin = this._windowOffsetLeft;
        const horizontalMax = window.innerWidth - this._windowOffset;
        const verticalMin = this._windowOffset;
        const verticalMax = this._pageHeight - this._windowOffset;

        if (this.getPosition() === 'left' && tooltipLeft < horizontalMin) {
            this.shrinkMaxWidth();
        } else if (this.getPosition() === 'right' && tooltipRight > horizontalMax) {
            this.shrinkMaxWidth();
        } else if (tooltipLeft < horizontalMin && tooltipRight > horizontalMax) {
            this.shrinkMaxWidth();
        } else if (tooltipTop < verticalMin) {
            const diff = verticalMin - tooltipTop;
            if (contentBottom + diff < horizontalMax) {
                this._tooltipComponentRef.setInput('top', tooltipTop + diff);
                this._tooltipComponentRef.changeDetectorRef.detectChanges();
                this.show();
            } else {
                this.increaseMaxWidth();
            }
        } else if (contentBottom > verticalMax) {
            const diff = contentBottom - verticalMax;
            if (tooltipTop - diff >= verticalMin) {
                this._tooltipComponentRef.setInput('top', tooltipTop - diff);
                this._tooltipComponentRef.changeDetectorRef.detectChanges();
                this.show();
            } else {
                this.increaseMaxWidth();
            }
        } else {
            this.show();
        }
    }

    private shrinkMaxWidth() {
        if (this._maxWidth > this._minWidth) {
            this._maxWidth -= this._maxWidth / 20;
            this.doUpdate();
        } else {
            if (!this._positionFlipped) {
                this._positionFlipped = true;
                // Reset _maxWidth, flip position and try again.
                this._maxWidth = this.parseMaxWidthValue();
                this.position = flipPosition(this.position);
                this.doUpdate();
            } else {
                // The tooltip is too small and therefore will be destroyed.
                console.error('De tooltip past niet binnen het beeld en is weer verwijderd');
                this.destroy();
            }
        }
    }

    private increaseMaxWidth() {
        if (!this._tooltipComponentRef || !this._tooltipNativeElement) {
            console.error('Tooltip element does not exist');
            return;
        }

        const horizontalMin = this._windowOffsetLeft;
        const horizontalMax = window.innerWidth - this._windowOffset;
        const newWidth = this._tooltipNativeElement.getBoundingClientRect().width + this._maxWidth / 10;

        if (newWidth < horizontalMax - horizontalMin) {
            this._maxWidth += this._maxWidth / 10;
            this.doUpdate();
        } else {
            if (!this._positionFlipped) {
                this._positionFlipped = true;
                // Reset _maxWidth, flip position and try again.
                this._maxWidth = this.parseMaxWidthValue();
                this.position = flipPosition(this.position);
                this.doUpdate();
            } else {
                // The tooltip is too large and therefore will be destroyed.
                console.error('De tooltip past niet binnen het beeld en is weer verwijderd');
                this.destroy();
            }
        }
    }
}
