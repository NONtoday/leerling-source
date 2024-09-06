import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { BijlageComponent } from 'leerling-base';
import { ConnectGebruikService } from 'leerling-connect';
import { Leermiddel, LeermiddelModel } from '../../studiemateriaal-frontend-model';
import { BijlagenMapComponent } from '../bijlagen-map/bijlagen-map.component';

@Component({
    selector: 'sl-leermiddelen',
    standalone: true,
    imports: [CommonModule, BijlagenMapComponent, BijlageComponent],
    templateUrl: './leermiddelen.component.html',
    styleUrl: './leermiddelen.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeermiddelenComponent {
    private _connectGebruikService = inject(ConnectGebruikService);

    public leermiddelen = input.required<LeermiddelModel | undefined>();
    public toonAlgemeneLeermiddelen = input<boolean>(true);

    public registreerGebruik(leermiddel: Leermiddel) {
        this._connectGebruikService.registreerLeermiddelGebruik(leermiddel);
    }
}
