import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, inject } from '@angular/core';
import { differenceInCalendarDays } from 'date-fns';
import { onRefresh } from 'leerling-util';
import { VakantieDisplay } from 'leerling/store';
import { Observable } from 'rxjs';
import { VakantieService } from '../../services/vakantie.service';

@Component({
    selector: 'sl-vakantie-header',
    imports: [CommonModule],
    templateUrl: './vakantie-header.component.html',
    styleUrls: ['./vakantie-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VakantieHeaderComponent implements OnChanges {
    private _vakantieService = inject(VakantieService);
    private _elementRef = inject(ElementRef);

    @Input({ required: true }) public beginDatum: Date;
    @Input({ required: true }) public eindDatum: Date;

    public vakanties$: Observable<VakantieDisplay[]>;

    constructor() {
        onRefresh(() => this.setObservableEnAantalDagen());
    }

    ngOnChanges(): void {
        this.setObservableEnAantalDagen();
    }

    private setObservableEnAantalDagen() {
        this.vakanties$ = this._vakantieService.getVakanties(this.beginDatum, this.eindDatum);
        const aantalDagen = differenceInCalendarDays(this.eindDatum, this.beginDatum) + 1;
        this._elementRef.nativeElement.style.setProperty('--aantal-dagen', aantalDagen);
    }
}
