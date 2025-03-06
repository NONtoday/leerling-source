import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VakIconComponent } from 'harmony';

@Component({
    selector: 'sl-ouderavond-vak-docent',
    imports: [CommonModule, VakIconComponent],
    templateUrl: './ouderavond-vak-docent.component.html',
    styleUrl: './ouderavond-vak-docent.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OuderavondVakDocentComponent {
    public vak = input.required<string>();
    public docent = input.required<string[]>();
}
