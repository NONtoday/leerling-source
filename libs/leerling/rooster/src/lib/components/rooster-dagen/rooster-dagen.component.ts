import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, QueryList, ViewChildren, computed } from '@angular/core';
import { addDays, isFriday, isMonday } from 'date-fns';
import { AbstractDrieluikComponent, Direction, DrieluikDataPipe } from 'leerling-util';
import { RoosterDagComponent } from '../rooster-dag/rooster-dag.component';
import { RoosterTijdenComponent } from '../rooster-tijden/rooster-tijden.component';

@Component({
    selector: 'sl-rooster-dagen',
    standalone: true,
    imports: [CommonModule, RoosterTijdenComponent, RoosterDagComponent, DrieluikDataPipe],
    templateUrl: './rooster-dagen.component.html',
    styleUrls: ['../../../../../util/src/lib/abstract-drieluik/abstract-drieluik.component.scss', './rooster-dagen.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterDagenComponent extends AbstractDrieluikComponent<RoosterDagComponent> {
    @ViewChildren(RoosterDagComponent) dagen: QueryList<RoosterDagComponent>;

    public datums = computed(() => [
        addDays(this.peildatum(), isMonday(this.peildatum()) ? -3 : -1),
        this.peildatum(),
        addDays(this.peildatum(), isFriday(this.peildatum()) ? 3 : 1)
    ]);

    public override getElements(): RoosterDagComponent[] {
        return this.dagen.toArray();
    }

    public override onNavigation(direction: Direction): void {
        const fridayIndex = isFriday(this.peildatum()) ? 3 : 1;
        const mondayIndex = isMonday(this.peildatum()) ? -3 : -1;

        this.peildatumChange.emit(addDays(this.peildatum(), direction === 'next' ? fridayIndex : mondayIndex));
    }

    public override getAantalSwipeDagen(): number {
        return 1;
    }
}
