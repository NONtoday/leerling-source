import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output } from '@angular/core';
import { addDays, format, isSameDay, isToday, startOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { SStudiewijzerItem } from 'leerling/store';
import { range } from 'lodash-es';
import { ElementRefProvider } from '../../element-ref-provider';
import { DagHeaderTabComponent } from '../dag-header-tab/dag-header-tab.component';
import { DagHeaderAriaLabelPipe } from './dag-header-aria-label.pipe';

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
    imports: [CommonModule, DagHeaderTabComponent, DagHeaderAriaLabelPipe],
    templateUrl: './dag-header.component.html',
    styleUrls: ['./dag-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DagHeaderComponent implements ElementRefProvider {
    public elementRef = inject(ElementRef);

    public datum = input.required<Date>();
    public huiswerkItems = input<SStudiewijzerItem[]>();
    public customTabindex = input<number>(0);

    public weekend = output<boolean>();
    public navigation = output<Date>();

    public dates = computed(() => {
        const maandag = startOfWeek(this.datum(), { weekStartsOn: 1 });
        return [
            this.formatDateTab(maandag),
            ...range(1, 5).map((index) => {
                const dag = addDays(maandag, index);
                return this.formatDateTab(dag);
            })
        ];
    });

    private formatDateTab(date: Date): DayDateTab {
        const dagItems = this.huiswerkItems()?.filter((item) => item.datumTijd?.getDate() === date.getDate());
        const weekItems = this.huiswerkItems()?.filter((item) => item.swiToekenningType === 'WEEK');
        const today = isToday(date);
        return {
            datum: date,
            dagEnWeekItems: [...(dagItems ?? []), ...(weekItems ?? [])],
            dayOfWeek: format(date, 'EEEEE', { locale: nl }),
            numberOfMonth: format(date, 'd', { locale: nl }),
            isToday: today,
            isActive: isSameDay(this.datum(), date),
            description: (today ? 'vandaag ' : '') + format(date, 'EEEE d-MMMM', { locale: nl })
        };
    }

    public onNavigation(direction: DayDateTab): void {
        this.navigation.emit(direction.datum);
    }
}
