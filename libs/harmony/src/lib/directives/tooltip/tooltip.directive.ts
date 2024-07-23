import {
    Directive,
    ElementRef,
    HostListener,
    Input,
    OnChanges,
    OnDestroy,
    Renderer2,
    SecurityContext,
    SimpleChanges,
    inject
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { isFunction } from 'lodash-es';
import { fromEvent } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { Optional } from '../../optional/optional';
import { DeviceService } from '../../services/device.service';
import { BorderToken } from '../../tokens/border-token';
import { ColorToken } from '../../tokens/color-token';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

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

    // The content of the hint.
    private _content: any;

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

    // The textual hint to be displayed.
    @Input() hmyTooltip: Optional<string> | (() => Optional<string>);

    // Displayed position of the hint.
    @Input() position: TooltipPosition = 'top';

    // Maximum width of the hint. Exceeding width will be displayed on multiple rows.
    @Input() maxWidth = 212;

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

    private _isOpenedOnTouch: boolean;

    @HostListener('focusin')
    @HostListener('mouseenter', ['$event'])
    onMouseEnter(event: any) {
        if (!event?.sourceCapabilities?.firesTouchEvents && !this._content && this.isDisplayable()) {
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

    @HostListener('focusout')
    @HostListener('mouseleave')
    @HostListener('click')
    onMouseLeave() {
        if (!this._isOpenedOnTouch) {
            this.destroy();
        }
    }

    @HostListener('window.resize')
    onresize() {
        if (this._content) {
            this.update();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this._content && changes['hmyTooltip'].currentValue !== changes['hmyTooltip'].previousValue) {
            this._renderer.setProperty(document.querySelector('hmy-tooltip'), 'innerHTML', this._sanitizedHtmlContent);
            this.update();
        }
    }

    private get _sanitizedHtmlContent() {
        const value = isFunction(this.hmyTooltip) ? this.hmyTooltip() : this.hmyTooltip;
        return value ? this._sanitizer.sanitize(SecurityContext.HTML, value) : undefined;
    }

    ngOnDestroy(): void {
        this.destroy();
    }

    private setup() {
        // The input value set to 'maxWidth' in the HTML can be interpreted as a string even though the type is number.
        // To make sure '_maxWidth' is an integer the value of 'maxWidth' is parsed to an integer.
        // The function 'parseInt' only accepts a string as input and therefore 'maxWidth' is converted to a string first.
        this._maxWidth = parseInt(String(this.maxWidth), 10);
        this._pageHeight = document.body.scrollHeight;

        // Update the offset so the tooltip doesn't cover the menu.
        if (!this._deviceService.isPhone) {
            this._windowOffsetLeft = 75;
        }

        this.createContent();
        this._renderer.addClass(this._elementRef.nativeElement, 'tooltip-open');
        this._renderer.addClass(this._content, 'hmy-tooltip');
        this._renderer.appendChild(document.body, this._content);

        this._router.events
            .pipe(
                filter((event) => event instanceof NavigationStart || event instanceof NavigationEnd),
                take(1)
            )
            .subscribe(() => {
                this.destroy();
            });

        setTimeout(() => {
            if (this._content) {
                this.update();
            }
        });
    }

    private createContent() {
        const content = this._renderer.createElement('hmy-tooltip');
        this.addTransitionStyling(content);
        this._renderer.setProperty(content, 'innerHTML', this._sanitizedHtmlContent);
        this._renderer.setStyle(content, 'position', 'absolute');
        this._renderer.setStyle(content, 'padding', `${this._verticalPadding}px ${this._horizontalPadding}px`);
        this._renderer.setStyle(content, 'background-color', `var(--${'bg-elevated-weakest' satisfies ColorToken})`);
        this._renderer.setStyle(content, 'border-radius', 'var(--br-normal)');
        this._renderer.setStyle(content, 'font', 'var(--body-content-small-regular)');
        this._renderer.setStyle(content, 'color', `var(--${'text-moderate' satisfies ColorToken})`);
        this._renderer.setStyle(content, 'border', `var(--${'thinnest-solid-neutral-strong' satisfies BorderToken})`);
        this._renderer.setStyle(content, 'box-shadow', 'var(--shadow-raised-strong)');

        if (this.alignCenter) {
            this._renderer.setStyle(content, 'text-align', 'center');
        }

        // Initial placement to prevent a scrollbar from displaying.
        this._renderer.setStyle(content, 'top', '0px');
        this._renderer.setStyle(content, 'left', '0px');

        // Remove bullets
        const bulletElements = content.querySelectorAll('ul');
        if (bulletElements) {
            bulletElements.forEach((element: HTMLElement) => this._renderer.setStyle(element, 'list-style', 'none'));
        }

        this._content = content;
    }

    // Adds a z-index and transition styling to the given element.
    // Default opacity is zero.
    private addTransitionStyling(element: any) {
        this._renderer.setStyle(element, 'z-index', 1000);
        this._renderer.setStyle(element, 'opacity', '0');
        this._renderer.setStyle(element, '-webkit-transition', 'opacity 300ms');
        this._renderer.setStyle(element, '-moz-transition', 'opacity 300ms');
        this._renderer.setStyle(element, '-o-transition', 'opacity 300ms');
        this._renderer.setStyle(element, 'transition', 'opacity 300ms');
    }

    private update() {
        const position = this.getPosition();
        this._renderer.setStyle(this._content, 'max-width', `${this._maxWidth}px`);

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

    // Update styling for the hint displayed on the top.
    private updateTop() {
        this.updateHorizontal();
        const elementBounds = this._elementRef.nativeElement.getBoundingClientRect();
        const contentBounds = this._content.getBoundingClientRect();
        const tooltipBottom = elementBounds.top - this.elementOffset;

        this._renderer.setStyle(this._content, 'top', `${window.pageYOffset + tooltipBottom - contentBounds.height}px`);
        this.fitHorizontalWithinBounds();
    }

    // Update styling for the hint displayed on the bottom.
    private updateBottom() {
        this.updateHorizontal();
        const elementBounds = this._elementRef.nativeElement.getBoundingClientRect();
        const tooltipTop = Number(elementBounds.bottom) + this.elementOffset;

        this._renderer.setStyle(this._content, 'top', `${window.pageYOffset + tooltipTop}px`);
        this.fitHorizontalWithinBounds();
    }

    // Update all styling for the hint displayed on the top or the bottom.
    private updateHorizontal() {
        const contentBounds = this._content.getBoundingClientRect();
        const elementBounds = this._elementRef.nativeElement.getBoundingClientRect();
        const elementCenter = Number(elementBounds.left) + elementBounds.width / 2;

        this._renderer.setStyle(this._content, 'left', `${window.pageXOffset + elementCenter - contentBounds.width / 2}px`);
    }

    private updateLeft() {
        this.updateVertical();
        const contentBounds = this._content.getBoundingClientRect();
        const elementBounds = this._elementRef.nativeElement.getBoundingClientRect();
        const tooltipRight = elementBounds.left - this.elementOffset;

        this._renderer.setStyle(this._content, 'left', `${window.pageXOffset + tooltipRight - contentBounds.width}px`);
        this.fitVerticalWithinBounds();
    }

    private updateRight() {
        this.updateVertical();
        const elementBounds = this._elementRef.nativeElement.getBoundingClientRect();
        const tooltipLeft = Number(elementBounds.right) + this.elementOffset;

        this._renderer.setStyle(this._content, 'left', `${window.pageXOffset + tooltipLeft}px`);
        this.fitVerticalWithinBounds();
    }

    private updateVertical() {
        const contentBounds = this._content.getBoundingClientRect();
        const elementBounds = this._elementRef.nativeElement.getBoundingClientRect();
        const elementCenter = Number(elementBounds.top) + elementBounds.height / 2;

        this._renderer.setStyle(this._content, 'top', `${window.pageYOffset + elementCenter - contentBounds.height / 2}px`);
    }

    // Update the contents position to fit within the bounds of the clients window.
    private fitHorizontalWithinBounds() {
        const contentBounds = this._content.getBoundingClientRect();
        let contentLeft: number = contentBounds.left;
        const contentRight: number = contentBounds.right;
        const contentWidth: number = contentBounds.width;
        const contentTop = Number(contentBounds.top) + window.pageYOffset;
        const contentBottom = Number(contentBounds.bottom) + window.pageYOffset;

        const horizontalMin = this._windowOffsetLeft;
        const horizontalMax = window.innerWidth - this._windowOffset;
        const verticalMin = this._windowOffset;
        const verticalMax = this._pageHeight - this._windowOffset;

        if (this.getPosition() === 'top' && contentTop < verticalMin) {
            this.increaseMaxWidth();
        } else if (this.getPosition() === 'bottom' && contentBottom > verticalMax) {
            this.increaseMaxWidth();
        } else if (contentLeft < horizontalMin && contentRight > horizontalMax) {
            this.shrinkMaxWidth();
        } else if (contentLeft < horizontalMin) {
            const diff = horizontalMin - contentLeft;
            if (contentRight + diff < horizontalMax) {
                this._renderer.setStyle(this._content, 'left', `${window.pageXOffset + contentLeft + diff}px`);
                this.show();
            } else {
                this.shrinkMaxWidth();
            }
        } else if (contentRight > horizontalMax) {
            let diff = contentRight - horizontalMax;
            if (contentWidth < this._maxWidth) {
                diff += this._maxWidth - contentWidth;
            }

            if (contentLeft - diff > horizontalMin) {
                // Determine and set contentLeft
                contentLeft -= diff;
                this._renderer.setStyle(this._content, 'left', `${window.pageXOffset + contentLeft}px`);

                // Calculate new contentBounds
                const newBounds = this._content.getBoundingClientRect();

                // Add correction to the left when the hint is displayed on the right side on the screen.
                // We need to draw this from RtL instead of the default LtR.
                if (newBounds.width < this._maxWidth) {
                    contentLeft += this._maxWidth - newBounds.width;
                    this._renderer.setStyle(this._content, 'left', `${window.pageXOffset + contentLeft}px`);
                }
                if (newBounds.height < contentBounds.height) {
                    this._renderer.setStyle(
                        this._content,
                        'top',
                        `${window.pageYOffset + Number(contentBounds.top) + Number(contentBounds.height) - newBounds.height}px`
                    );
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
            if (this._content) {
                this._renderer.setStyle(this._content, 'opacity', '1');
            }
            fromEvent(window, 'touchstart')
                .pipe(take(1))
                .subscribe(() => {
                    this.destroy();
                });
        } else {
            setTimeout(() => {
                if (this._content) {
                    this._renderer.setStyle(this._content, 'opacity', '1');
                }
            }, this.tooltipDisplayDelay);
        }
    }

    private fitVerticalWithinBounds() {
        const contentBounds = this._content.getBoundingClientRect();
        const contentLeft = contentBounds.left;
        const contentRight = contentBounds.right;
        const contentTop = Number(contentBounds.top) + window.pageYOffset;
        const contentBottom = Number(contentBounds.bottom) + window.pageYOffset;

        const horizontalMin = this._windowOffsetLeft;
        const horizontalMax = window.innerWidth - this._windowOffset;
        const verticalMin = this._windowOffset;
        const verticalMax = this._pageHeight - this._windowOffset;

        if (this.getPosition() === 'left' && contentLeft < horizontalMin) {
            this.shrinkMaxWidth();
        } else if (this.getPosition() === 'right' && contentRight > horizontalMax) {
            this.shrinkMaxWidth();
        } else if (contentLeft < horizontalMin && contentRight > horizontalMax) {
            this.shrinkMaxWidth();
        } else if (contentTop < verticalMin) {
            const diff = verticalMin - contentTop;
            if (contentBottom + diff < horizontalMax) {
                this._renderer.setStyle(this._content, 'top', `${contentTop + diff}px`);
                this.show();
            } else {
                this.increaseMaxWidth();
            }
        } else if (contentBottom > verticalMax) {
            const diff = contentBottom - verticalMax;
            if (contentTop - diff >= verticalMin) {
                this._renderer.setStyle(this._content, 'top', `${contentTop - diff}px`);
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
            this.update();
        } else {
            // The tooltip is too small and therefore will be destroyed.
            this.destroy();
        }
    }

    private increaseMaxWidth() {
        const horizontalMin = this._windowOffsetLeft;
        const horizontalMax = window.innerWidth - this._windowOffset;
        const newWidth = Number(this._content.getBoundingClientRect().width) + this._maxWidth / 10;
        if (newWidth < horizontalMax - horizontalMin) {
            this._maxWidth += this._maxWidth / 10;
            this.update();
        } else {
            // The tooltip is too large and therefore will be destroyed.
            console.error('De tooltip past niet binnen het beeld en is weer verwijderd');
            this.destroy();
        }
    }

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

    // Remove hint from the dom and set all created elements to null.
    private destroy() {
        if (this._content) {
            this._renderer.removeChild(document.body, this._content);
        }
        this._content = null;
        this._renderer.removeClass(this._elementRef.nativeElement, 'tooltip-open');
    }

    public isDisplayable(): boolean {
        const showAlwaysOrEllipsed =
            !this.showIfEllipsed || this._elementRef.nativeElement.scrollWidth > this._elementRef.nativeElement.clientWidth;
        // Explicit check needed because the input could be a string.
        return showAlwaysOrEllipsed && this.hasValue && this.tooltipDisplayable?.toString() === 'true';
    }

    private get hasValue(): boolean {
        const value = isFunction(this.hmyTooltip) ? this.hmyTooltip() : this.hmyTooltip;
        return value ? value.trim().length > 0 : false;
    }
}
