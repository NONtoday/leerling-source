import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AvatarComponent } from 'harmony';
import { SomtodayAccountProfiel } from 'leerling-authentication';
import { Optional } from 'leerling/store';

@Component({
    selector: 'sl-stacked-avatar',
    standalone: true,
    imports: [CommonModule, AvatarComponent],
    templateUrl: './stacked-avatar.component.html',
    styleUrls: ['./stacked-avatar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StackedAvatarComponent {
    @Input() public accountProfile: Optional<SomtodayAccountProfiel>;
}
