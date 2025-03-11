import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconSluiten, IconVerwijderen, provideIcons } from 'harmony-icons';
import { ButtonComponent } from '../button/button.component';
import { IconDirective } from '../icon/icon.directive';

@Component({
    selector: 'hmy-verwijder-confirmation',
    standalone: true,
    imports: [CommonModule, IconDirective, A11yModule, ButtonComponent],
    templateUrl: './verwijder-confirmation.component.html',
    styleUrl: './verwijder-confirmation.component.scss',
    providers: [provideIcons(IconSluiten, IconVerwijderen)],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerwijderConfirmationComponent {
    label = input.required<string>();
    confirmed = output();
    canceled = output();
}
