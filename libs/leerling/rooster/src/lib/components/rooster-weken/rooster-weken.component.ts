import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, QueryList, ViewChildren, computed, inject, input, output } from '@angular/core';
import { addWeeks } from 'date-fns';
import { AbstractDrieluikComponent, AccessibilityService, Direction, DrieluikDataPipe } from 'leerling-util';
import { isDayInCurrentSchoolyear, nextFridayOrDateIfFriday, previousMondayOrDateIfMonday } from 'leerling/store';
import { RoosterTijdenComponent } from '../rooster-tijden/rooster-tijden.component';
import { RoosterWeekComponent } from '../rooster-week/rooster-week.component';

@Component({
    selector: 'sl-rooster-weken',
    imports: [CommonModule, RoosterWeekComponent, RoosterTijdenComponent, DrieluikDataPipe],
    templateUrl: './rooster-weken.component.html',
    styleUrls: ['../../../../../util/src/lib/abstract-drieluik/abstract-drieluik.component.scss', './rooster-weken.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterWekenComponent extends AbstractDrieluikComponent<RoosterWeekComponent> {
    private _accessibilityService = inject(AccessibilityService);

    @ViewChildren(RoosterWeekComponent) weken: QueryList<RoosterWeekComponent>;

    public toonWeekend = input.required<boolean>();

    public focusVolgendeWeekMaandag = output<void>();

    public datums = computed(() => [addWeeks(this.peildatum(), -1), this.peildatum(), addWeeks(this.peildatum(), 1)]);

    override getElements(): RoosterWeekComponent[] {
        return this.weken.toArray();
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

    public override afterKeyboardArrowNavigation() {
        // Alleen pijltjes toetsen is niet genoeg: de gebruiker moet echt met toetsenbord aan het werk zijn
        // voor het focussen van een element.
        if (this._accessibilityService.isAccessedByKeyboard()) {
            this._accessibilityService.focusElementWithTabIndex(200);
        }
    }

    public override isNextNavigationDisabled(): boolean {
        return !isDayInCurrentSchoolyear(previousMondayOrDateIfMonday(this.datums()[2]));
    }

    public override isPreviousNavigationDisabled(): boolean {
        return !isDayInCurrentSchoolyear(nextFridayOrDateIfFriday(this.datums()[0]));
    }
}
