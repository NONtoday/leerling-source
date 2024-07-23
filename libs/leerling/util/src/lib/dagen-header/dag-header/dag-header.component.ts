import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges, inject, output } from '@angular/core';
import { addDays, format, isSameDay, isToday, startOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { SStudiewijzerItem } from 'leerling/store';
import { range } from 'lodash-es';
import { AccessibilityService } from '../../accessibility/accessibility.service';
import { ElementRefProvider } from '../../element-ref-provider';
import { DagHeaderTabComponent } from '../dag-header-tab/dag-header-tab.component';

export type DayDateTab = {
    datum: Date;
    dagEnWeekItems: SStudiewijzerItem[];
    dayOfWeek: string;
    numberOfMonth: string;
    isToday: boolean;
    isActive: boolean;
    description: string;
};

@Component({
    selector: 'sl-dag-header',
    standalone: true,
    imports: [CommonModule, DagHeaderTabComponent],
    templateUrl: './dag-header.component.html',
    styleUrls: ['./dag-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DagHeaderComponent implements ElementRefProvider, OnChanges {
    private accessibilityService = inject(AccessibilityService);

    public elementRef = inject(ElementRef);

    @Input({ required: true }) public datum: Date;
    @Input() public huiswerkItems: SStudiewijzerItem[] | undefined;
    @Input({ required: true }) public customTabindex: number;

    public weekend = output<boolean>();
    public navigation = output<Date>();

    public dates: DayDateTab[];

    public ngOnChanges(simpleChanges: SimpleChanges): void {
        const previousValue = simpleChanges['datum']?.previousValue;
        const datumChanged = !isSameDay(previousValue, this.datum);
        if (datumChanged) {
            this.updateDates();
        }
    }

    private updateDates(): DayDateTab[] {
        const maandag = startOfWeek(this.datum, { weekStartsOn: 1 });
        return (this.dates = [
            this.formatDateTab(maandag),
            ...range(1, 5).map((index) => {
                const dag = addDays(maandag, index);
                return this.formatDateTab(dag);
            })
        ]);
    }

    private formatDateTab(date: Date): DayDateTab {
        const dagItems = this.huiswerkItems?.filter((item) => item.datumTijd?.getDate() === date.getDate());
        const weekItems = this.huiswerkItems?.filter((item) => item.swiToekenningType === 'WEEK');
        const today = isToday(date);
        return {
            datum: date,
            dagEnWeekItems: [...(dagItems ?? []), ...(weekItems ?? [])],
            dayOfWeek: format(date, 'EEEEE', { locale: nl }),
            numberOfMonth: format(date, 'd', { locale: nl }),
            isToday: today,
            isActive: isSameDay(this.datum, date),
            description: (today ? 'vandaag ' : '') + format(date, 'EEEE d-MMMM', { locale: nl })
        };
    }

    public onNavigation(direction: DayDateTab): void {
        this.navigation.emit(direction.datum);
    }
}
