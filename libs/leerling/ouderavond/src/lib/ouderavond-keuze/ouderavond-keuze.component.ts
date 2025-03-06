import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, HostListener, input, model, output } from '@angular/core';
import { CheckboxComponent } from 'harmony';
import { AfspraakVerzoek } from '../model/ouderavond.model';
import { OuderavondVakDocentComponent } from '../ouderavond-vak-docent/ouderavond-vak-docent.component';

@Component({
    selector: 'sl-ouderavond-keuze',
    imports: [CommonModule, CheckboxComponent, OuderavondVakDocentComponent],
    templateUrl: './ouderavond-keuze.component.html',
    styleUrl: './ouderavond-keuze.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.checked]': 'isChecked()',
        '[class.disabled]': 'disabled()'
    }
})
export class OuderavondKeuzeComponent {
    public keuze = input.required<AfspraakVerzoek>();
    public isInschrijvenDisabled = input<boolean>(false);

    public disabled = computed(() => !this.isChecked() && this.isInschrijvenDisabled());
    public isChecked = model(false);

    public checkboxChanged = output<boolean>();

    toggleChecked(event: Event) {
        event.stopPropagation();
        this.onClick();
    }

    @HostListener('click')
    onClick() {
        if (this.disabled()) return;
        const newValue = !this.isChecked();
        this.isChecked.set(newValue);
        this.checkboxChanged.emit(newValue);
    }
}
