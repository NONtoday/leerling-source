import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconNoRadio, provideIcons } from 'harmony-icons';
import { IconDirective } from '../icon/icon.directive';

@Component({
    selector: 'hmy-error-bar',
    standalone: true,
    imports: [CommonModule, IconDirective],
    templateUrl: './error-bar.component.html',
    styleUrl: './error-bar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconNoRadio)]
})
export class ErrorBarComponent {
    public message = input<string>('');
}
