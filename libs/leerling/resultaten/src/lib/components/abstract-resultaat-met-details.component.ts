import { Directive, HostBinding, HostListener, Input, OnChanges, output } from '@angular/core';
import { ResultaatItem } from './resultaat-item/resultaat-item-model';

@Directive()
export abstract class AbstractResultaatMetDetailsComponent implements OnChanges {
    @Input({ required: true }) @HostBinding('class.selected') public toonDetails: boolean;
    toonDetailsEvent = output<ResultaatItem | undefined>();

    public resultaatItem: ResultaatItem;

    abstract provideResultaatItem(): ResultaatItem;

    ngOnChanges(): void {
        this.resultaatItem = this.provideResultaatItem();
    }

    @HostListener('document:click')
    clickedOut() {
        this.toonDetailsEvent.emit(undefined);
    }

    @HostListener('click', ['$event'])
    public onClick(event: Event) {
        event.stopPropagation();
        this.toonDetailsEvent.emit(this.resultaatItem);
    }
}
