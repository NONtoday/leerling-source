import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, QueryList, ViewChildren, computed } from '@angular/core';
import { addDays, isFriday, isMonday } from 'date-fns';
import { AbstractDrieluikComponent, Direction, DrieluikDataPipe } from 'leerling-util';
import { isDayInCurrentSchoolyear } from 'leerling/store';
import { RoosterDagComponent } from '../rooster-dag/rooster-dag.component';
import { RoosterTijdenComponent } from '../rooster-tijden/rooster-tijden.component';

@Component({
    selector: 'sl-rooster-dagen',
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
        const potentialNewPeildatum = addDays(this.peildatum(), direction === 'next' ? fridayIndex : mondayIndex);
        if (isDayInCurrentSchoolyear(potentialNewPeildatum)) this.peildatumChange.emit(potentialNewPeildatum);
    }

    public override getAantalSwipeDagen(): number {
        return 1;
    }

    public override isNextNavigationDisabled(): boolean {
        return !isDayInCurrentSchoolyear(this.datums()[2]);
    }

    public override isPreviousNavigationDisabled(): boolean {
        return !isDayInCurrentSchoolyear(this.datums()[0]);
    }
}
