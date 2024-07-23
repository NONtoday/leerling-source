import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconDirective, SpinnerComponent, ToggleComponent, TooltipDirective } from 'harmony';
import { IconInformatie, provideIcons } from 'harmony-icons';
import { StackedAvatarComponent } from 'leerling-avatar';

@Component({
    selector: 'sl-toestemming',
    standalone: true,
    imports: [CommonModule, ToggleComponent, FormsModule, StackedAvatarComponent, SpinnerComponent, IconDirective, TooltipDirective],
    templateUrl: './toestemming.component.html',
    styleUrls: ['./toestemming.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconInformatie)]
})
export class ToestemmingComponent {
    public naam = input.required<string>();
    public toelichting = input<string>();
    public waarde = model.required<boolean>();
    public disabled = input<boolean>(false);

    public naamToelichtingAriaLabel = computed(() => {
        if (this.toelichting()) return this.naam() + ' - ' + this.toelichting();

        return this.naam();
    });

    public update = output<boolean>();

    public updateWaarde() {
        if (this.disabled()) return;
        const waarde = !this.waarde();
        this.waarde.set(waarde);
        this.update.emit(waarde);
    }
}
