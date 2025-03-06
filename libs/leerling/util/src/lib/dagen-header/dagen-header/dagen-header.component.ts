import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, QueryList, ViewChildren, computed, inject, input, output } from '@angular/core';
import { addWeeks } from 'date-fns';
import { SStudiewijzerItem, isDayInCurrentSchoolyear, nextFridayOrDateIfFriday, previousMondayOrDateIfMonday } from 'leerling/store';
import { AbstractDrieluikComponent } from '../../abstract-drieluik/abstract-drieluik.component';
import { Direction } from '../../abstract-drieluik/direction';
import { DrieluikDataPipe } from '../../abstract-drieluik/drieluik-data.pipe';
import { DagHeaderComponent } from '../dag-header/dag-header.component';

@Component({
    selector: 'sl-dagen-header',
    imports: [CommonModule, DagHeaderComponent, DrieluikDataPipe],
    templateUrl: './dagen-header.component.html',
    styleUrls: ['../../abstract-drieluik/abstract-drieluik.component.scss', './dagen-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DagenHeaderComponent extends AbstractDrieluikComponent<DagHeaderComponent> {
    @ViewChildren(DagHeaderComponent) headers: QueryList<DagHeaderComponent>;
    public elementRef = inject(ElementRef);

    public huiswerkItems = input<SStudiewijzerItem[][] | undefined>();
    public showSwipeIndicator = input<boolean>();

    public dateChange = output<Date>();

    public datums = computed(() => [addWeeks(this.peildatum(), -1), this.peildatum(), addWeeks(this.peildatum(), 1)]);

    public updatePeildatum(date: Date) {
        if (isDayInCurrentSchoolyear(date)) {
            this.dateChange.emit(date);
        }
    }

    public override getElements(): DagHeaderComponent[] {
        return this.headers.toArray();
    }
    public override onNavigation(direction: Direction): void {
        const isNext = direction === 'next';
        let newPeildatum = addWeeks(this.peildatum(), isNext ? 1 : -1);
        let inSchooljaar = isDayInCurrentSchoolyear(newPeildatum);
        if (!inSchooljaar) {
            newPeildatum = isNext ? previousMondayOrDateIfMonday(newPeildatum) : nextFridayOrDateIfFriday(newPeildatum);
            inSchooljaar = isDayInCurrentSchoolyear(newPeildatum);
        }
        if (inSchooljaar) {
            this.peildatumChange.emit(newPeildatum);
        }
    }

    public override getAantalSwipeDagen(): number {
        return 7;
    }

    public override isNextNavigationDisabled(): boolean {
        return !isDayInCurrentSchoolyear(previousMondayOrDateIfMonday(this.datums()[2]));
    }

    public override isPreviousNavigationDisabled(): boolean {
        return !isDayInCurrentSchoolyear(nextFridayOrDateIfFriday(this.datums()[0]));
    }
}
