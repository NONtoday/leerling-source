import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, QueryList, ViewChildren, computed, inject, input, output } from '@angular/core';
import { addWeeks } from 'date-fns';
import { SStudiewijzerItem } from 'leerling/store';
import { AbstractDrieluikComponent } from '../../abstract-drieluik/abstract-drieluik.component';
import { Direction } from '../../abstract-drieluik/direction';
import { DrieluikDataPipe } from '../../abstract-drieluik/drieluik-data.pipe';
import { DagHeaderComponent } from '../dag-header/dag-header.component';

@Component({
    selector: 'sl-dagen-header',
    standalone: true,
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
        this.dateChange.emit(date);
    }

    public override getElements(): DagHeaderComponent[] {
        return this.headers.toArray();
    }
    public override onNavigation(direction: Direction): void {
        this.peildatumChange.emit(addWeeks(this.peildatum(), direction === 'next' ? 1 : -1));
    }

    public override getAantalSwipeDagen(): number {
        return 7;
    }
}
