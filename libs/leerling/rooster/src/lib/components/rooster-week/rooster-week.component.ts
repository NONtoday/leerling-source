import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges, inject, output } from '@angular/core';
import { addDays, isSameDay, startOfWeek } from 'date-fns';
import { ButtonComponent } from 'harmony';
import { ElementRefProvider } from 'leerling-util';
import { range } from 'lodash-es';
import { RoosterDagComponent } from '../rooster-dag/rooster-dag.component';

export type WeekDateTab = {
    dateString: string;
    isActive: boolean;
};

@Component({
    selector: 'sl-rooster-week',
    imports: [CommonModule, RoosterDagComponent, ButtonComponent],
    templateUrl: './rooster-week.component.html',
    styleUrls: ['./rooster-week.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterWeekComponent implements ElementRefProvider, OnChanges {
    public elementRef = inject(ElementRef);

    @Input({ required: true }) public datum: Date;
    @Input({ required: true }) public toonWeekend: boolean;

    public naarVolgendeWeek = output<void>();

    public dates: Date[];

    public ngOnChanges(simpleChanges: SimpleChanges): void {
        const previousValue = simpleChanges['datum']?.previousValue;
        const datumChanged = !isSameDay(previousValue, this.datum);
        const toonWeekendChanged = simpleChanges['toonWeekend']?.previousValue !== this.toonWeekend;
        if (datumChanged || toonWeekendChanged) {
            this.updateDates();
        }
    }

    private updateDates(): void {
        const maandag = startOfWeek(this.datum, { weekStartsOn: 1 });
        const aantalDagen = this.toonWeekend ? 7 : 5;
        this.dates = [maandag, ...range(1, aantalDagen).map((index) => addDays(maandag, index))];
    }

    trackByDatum(index: number, datum: Date): string {
        return datum.toISOString();
    }
}
