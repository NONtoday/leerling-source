import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'hmy-switch-group',
    standalone: true,
    imports: [CommonModule],
    template: `<ng-content></ng-content>`,
    styleUrls: ['./switch-group.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SwitchGroupComponent {}
