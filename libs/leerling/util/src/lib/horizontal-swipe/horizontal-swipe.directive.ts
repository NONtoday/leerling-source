import { Directive, HostListener, Input, output } from '@angular/core';

const MIN_DISTANCE = 50;
const MIN_SPEEED = 0.3;

@Directive({
    standalone: true,
    selector: '[slHorizontalSwipe]'
})
export class HorizontalSwipeDirective {
    @Input() public minDistance = MIN_DISTANCE;
    @Input() public minSpeed = MIN_SPEEED;

    public horizontalNext = output<void>();
    public horizontalPrevious = output<void>();

    private _startX = 0;
    private _timestamp = 0;

    @HostListener('touchstart', ['$event'])
    public onTouchStart(event: TouchEvent) {
        this._startX = event.touches[0].clientX;
        this._timestamp = event.timeStamp;
    }

    @HostListener('touchend', ['$event'])
    public onTouchEnd(event: TouchEvent) {
        const deltaX = event.changedTouches[0].clientX - this._startX;
        const speed = deltaX / (event.timeStamp - this._timestamp);

        if (Math.abs(deltaX) >= this.minDistance && Math.abs(speed) >= this.minSpeed) {
            if (deltaX > 0) this.horizontalPrevious.emit();
            else this.horizontalNext.emit();
        }
    }
}
