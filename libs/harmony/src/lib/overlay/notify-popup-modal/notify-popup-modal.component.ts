import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonComponent } from '../../button/button.component';

@Component({
    selector: 'hmy-notify-popup-modal',
    imports: [CommonModule, ButtonComponent],
    template: `<p class="text-moderate text-content">{{ text() }}</p>
        <hmy-button [label]="buttonLabel()" (click)="sluitenClick()()" mode="tertiary" />`,
    styleUrl: './notify-popup-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotifyPopupModalComponent {
    text = input.required<string>();
    buttonLabel = input.required<string>();
    sluitenClick = input.required<() => void>();
}
