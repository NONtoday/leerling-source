import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, inject, Input, OnInit } from '@angular/core';

@Component({
    selector: 'hmy-spinner',
    template: ``,
    styleUrls: ['./spinner.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    standalone: true
})
export class SpinnerComponent implements OnInit {
    private _changeDetector = inject(ChangeDetectorRef);

    @Input() @HostBinding('class.centered-in-parent') public centeredInParent = false;
    @Input() @HostBinding('class.white') public isWhite = false;
    @Input() @HostBinding('class.large') public large = false;
    @Input() public displayAfter = 0;

    @HostBinding('class.hide') private _hide = true;

    ngOnInit() {
        if (this.displayAfter === 0) {
            this._hide = false;
        } else {
            setTimeout(() => {
                this._hide = false;
                this._changeDetector.detectChanges();
            }, this.displayAfter);
        }
    }
}
