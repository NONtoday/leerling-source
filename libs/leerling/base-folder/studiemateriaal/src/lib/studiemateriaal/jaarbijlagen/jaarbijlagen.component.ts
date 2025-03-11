import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { IconChevronBoven, IconChevronOnder, IconMap, provideIcons } from 'harmony-icons';
import { BijlageComponent } from 'leerling-base';
import { ConnectGebruikService } from 'leerling-connect';
import { JaarBijlage, JaarbijlagenModel } from '../../studiemateriaal-frontend-model';
import { BijlagenMapComponent } from '../bijlagen-map/bijlagen-map.component';

@Component({
    selector: 'sl-jaarbijlagen',
    standalone: true,
    imports: [CommonModule, BijlageComponent, BijlagenMapComponent],
    templateUrl: './jaarbijlagen.component.html',
    styleUrl: './jaarbijlagen.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconMap, IconChevronOnder, IconChevronBoven)]
})
export class JaarbijlagenComponent {
    private _connectGebruikService = inject(ConnectGebruikService);

    public jaarBijlagen = input.required<JaarbijlagenModel | undefined>();

    registreerGebruik(bijlage: JaarBijlage) {
        if (bijlage.bijlageType === 'externMateriaal') {
            this._connectGebruikService.registreerJaarExternMateriaal(bijlage.bijlage.id);
        }
    }
}
