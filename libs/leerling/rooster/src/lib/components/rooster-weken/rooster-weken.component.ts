import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, QueryList, ViewChildren, computed, inject, input, output } from '@angular/core';
import { addWeeks } from 'date-fns';
import { AbstractDrieluikComponent, AccessibilityService, Direction, DrieluikDataPipe } from 'leerling-util';
import { RoosterTijdenComponent } from '../rooster-tijden/rooster-tijden.component';
import { RoosterWeekComponent } from '../rooster-week/rooster-week.component';

@Component({
    selector: 'sl-rooster-weken',
    standalone: true,
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
        this.peildatumChange.emit(addWeeks(this.peildatum(), direction === 'next' ? 1 : -1));
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
}
