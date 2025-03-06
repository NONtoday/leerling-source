import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, inject } from '@angular/core';
import { LazyLoadImageModule, StateChange } from 'ng-lazyload-image';
import { AltAvatarText } from './altAvatarText.pipe';

@Component({
    selector: 'hmy-avatar',
    templateUrl: './avatar.component.html',
    styleUrls: ['./avatar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, LazyLoadImageModule, AltAvatarText],
    host: {
        '[class.round-border]': 'roundBorder'
    }
})
export class AvatarComponent {
    private _changeDetectorRef = inject(ChangeDetectorRef);

    @Input() public src: string | null | undefined;
    @Input() public naam: string | undefined;
    @Input() public initialen: string | undefined;
    @Input() public lazyLoading = false;
    @Input() public profielfotoVerbergen: boolean | undefined = false;
    @Input() public roundBorder = false;

    public loading = true;

    stateChanged(event: StateChange) {
        if (event.reason !== 'finally') {
            this.loading = event.reason !== 'loading-succeeded';
            this._changeDetectorRef.detectChanges();
        }
    }
}
