import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnChanges, OnDestroy, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TooltipDirective, VakIconComponent } from 'harmony';
import { HeaderService } from '../header/service/header.service';

@Component({
    selector: 'sl-scrollable-title',
    standalone: true,
    imports: [CommonModule, TooltipDirective, VakIconComponent],
    templateUrl: './scrollable-title.component.html',
    styleUrls: ['./scrollable-title.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrollableTitleComponent implements OnChanges, OnDestroy {
    private _elementRef = inject(ElementRef);
    public headerService = inject(HeaderService);

    public title = input<string>('');
    public vakNaam = input<string | undefined>(undefined);

    headerTitle = toSignal(this.headerService.title$);

    constructor() {
        this.headerService.titleElementRef = this._elementRef;
    }

    ngOnChanges() {
        this.headerService.title = this.title();
    }

    ngOnDestroy(): void {
        this.headerService.title = undefined;
    }
}
