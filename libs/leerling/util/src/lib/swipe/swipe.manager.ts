import { isEqual } from 'lodash-es';
import { ISwipable, SwipeDirection } from './swipable.interface';

const MIN_SPEEED = 0.3;

export class SwipeManager {
    private startX: number;
    private startY: number;
    private previousPosition: number | undefined;
    private swipeDirection: SwipeDirection | undefined;
    private minimumSwipeReached = false;
    private translateAmount = 0;
    private swipeThreshold: number;
    private _touchStartTimestamp = 0;

    // Als we swipen, willen we niet scrollen.
    // Als je langzaam schuin swiped, kunnen we de scroll niet goed tegenhouden
    // Daarom houden we ook de scroll-positie bij, mochten we toch aan het scrollen zijn
    // dan swipen we niet.
    private initialScrollPosition: number | undefined = undefined;
    private swipable: ISwipable;

    constructor(swipable: ISwipable, swipeThreshold = 50) {
        this.swipable = swipable;
        this.swipeThreshold = swipeThreshold;
    }

    public onTouchStart(evt: TouchEvent): void {
        this.startX = evt.touches[0].clientX;
        this.startY = evt.touches[0].clientY;
        this.initialScrollPosition = this.getScrollPosition();
        this._touchStartTimestamp = evt.timeStamp;
    }

    public onTouchMove(evt: TouchEvent): void {
        if (this.initialScrollPosition === undefined) return;

        this.minimumSwipeReached = this.minimumSwipeReached || this.isMinimumSwipeReached(evt);

        if (this.minimumSwipeReached && this.swipeDirection === undefined) {
            this.swipeDirection = this.getSwipeDirection(evt);
        }

        const currentScrollPosition = this.getScrollPosition();
        // swipen we de goede kant op en zijn we niet aan het scrollen?
        if (
            this.swipeDirection &&
            this.swipable.getSwipeInfo().swipeDirection.includes(this.swipeDirection) &&
            this.initialScrollPosition === currentScrollPosition
        ) {
            this.swipable.onSwipeStart();
            if (evt.cancelable) evt.preventDefault();
            const current = this.isSwipeHorizontal() ? evt.touches[0].clientX : evt.touches[0].clientY;
            if (this.previousPosition !== undefined) {
                this.moveElement(current, this.previousPosition);
            }
            this.previousPosition = current;
        }
    }

    private moveElement(currentTranslateAmount: number, previousTranslateAmount: number) {
        const elementSize = this.getElementSize();
        let realTranslateAmount = this.translateAmount + currentTranslateAmount - previousTranslateAmount;

        const swipeDirection = this.swipable.getSwipeInfo().swipeDirection;
        if (isEqual(swipeDirection, ['right']) || isEqual(swipeDirection, ['down'])) {
            realTranslateAmount = Math.max(0, realTranslateAmount);
        }

        // Zijn we verder geswiped dan het element groot is?
        if (Math.abs(realTranslateAmount) > elementSize) {
            this.translateAmount = realTranslateAmount < 0 ? -elementSize : elementSize;
        } else {
            this.translateAmount = realTranslateAmount;
        }
        const translateValue = this.calculateTranslateValue();
        this.getSwipableNativeElement().style.transform = this.translateFunction(translateValue);
        this.swipable.onSwiping(translateValue);
    }

    private calculateTranslateValue(): number {
        return (this.translateAmount / this.getElementSize()) * 100;
    }

    private getSwipableNativeElement(): any {
        return this.swipable.getSwipeInfo().swipableElement.nativeElement;
    }

    private getScrollPosition(): number {
        const swipeInfo = this.swipable.getSwipeInfo().swipeDirection;
        return swipeInfo.includes('left') || swipeInfo.includes('right') ? window.scrollY : window.scrollX;
    }

    private getElementSize(): number {
        const swipableElement = this.getSwipableNativeElement();
        return this.isSwipeHorizontal() ? swipableElement.offsetWidth : swipableElement.offsetHeight;
    }

    private translateFunction(amount: number): string {
        const isHorizontal = this.isSwipeHorizontal();
        return 'translate3d(' + (isHorizontal ? '' : '0, ') + amount + (isHorizontal ? '%, 0, 0)' : '%, 0)');
    }

    public onTouchEnd(evt: TouchEvent): void {
        if (this.initialScrollPosition === undefined) return;

        if (this.swipeDirection && this.swipable.getSwipeInfo().swipeDirection.includes(this.swipeDirection)) {
            const touchEndPosition = this.isSwipeHorizontal() ? evt.changedTouches[0].clientX : evt.changedTouches[0].clientY;
            const start = this.isSwipeHorizontal() ? this.startX : this.startY;
            const pixelsMoved = Math.abs(touchEndPosition - start);
            const speed = pixelsMoved / (evt.timeStamp - this._touchStartTimestamp);

            if (
                (pixelsMoved > this.swipable.getSwipeInfo().pixelsMovedToSuccessfullSwipe && speed >= MIN_SPEEED) ||
                pixelsMoved > this.getPixelsMovedToSuccessfullSlowSwipe()
            ) {
                this.swipable.onSuccessfullSwipe(this.calculateTranslateValue());
            } else {
                this.cancelSwipe();
                this.swipable.onCancelSwipe();
            }
        }

        this.minimumSwipeReached = false;
        this.swipeDirection = undefined;
        this.translateAmount = 0;
        this.previousPosition = undefined;
        this.initialScrollPosition = undefined;
    }

    private getPixelsMovedToSuccessfullSlowSwipe(): number {
        return this.getElementSize() * 0.45;
    }

    private cancelSwipe() {
        const swipableElement = this.getSwipableNativeElement();
        swipableElement.classList.add('cancel-transition');
        swipableElement.style.transform = this.translateFunction(0);
        setTimeout(() => {
            swipableElement.classList.remove('cancel-transition');
        }, 220);
    }

    public isMinimumSwipeReached(evt: TouchEvent): boolean {
        const { deltaX, deltaY } = this.getDeltas(evt);
        return Math.abs(deltaY) > this.swipeThreshold || Math.abs(deltaX) > this.swipeThreshold;
    }

    public getSwipeDirection(evt: TouchEvent): SwipeDirection {
        const { deltaX, deltaY } = this.getDeltas(evt);

        const richting = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';

        if (richting === 'horizontal') {
            return deltaX > 0 ? 'right' : 'left';
        } else {
            return deltaY > 0 ? 'down' : 'up';
        }
    }

    private getDeltas(evt: TouchEvent): { deltaX: number; deltaY: number } {
        const currentX = evt.touches[0].clientX;
        const currentY = evt.touches[0].clientY;

        const deltaX = currentX - this.startX;
        const deltaY = currentY - this.startY;
        return { deltaX, deltaY };
    }

    private isSwipeHorizontal(): boolean {
        return this.swipeDirection === 'left' || this.swipeDirection === 'right';
    }
}
