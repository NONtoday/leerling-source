import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RLeerling, RLeerlingToestemmingen, RVerzorger } from 'leerling-codegen';
import { getEntiteitId } from 'leerling/store';
import { ToestemmingComponent } from '../toestemming/toestemming.component';
import { PortaalToestemmingOmschrijvingPipe } from './pipe/portaal-toestemming-omschrijving.pipe';
import { ToestemmingenService } from './service/toestemmingen.service';

@Component({
    selector: 'sl-toestemmingen',
    imports: [CommonModule, ToestemmingComponent, PortaalToestemmingOmschrijvingPipe],
    templateUrl: './toestemmingen.component.html',
    styleUrls: ['./toestemmingen.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToestemmingenComponent {
    private _toestemmingService = inject(ToestemmingenService);

    public toestemmingen = input.required<RLeerlingToestemmingen[]>();
    public toonLeerlingNaam = computed(() => this.toestemmingen().length > 1);
    public isVerzorger = signal(this._toestemmingService.isVerzorger);

    updateToestemming(leerling: RLeerling | undefined, veldUUID: string | undefined, waarde: boolean): void {
        if (!leerling || !veldUUID) return;
        this._toestemmingService.updateToestemming(getEntiteitId(leerling), veldUUID, waarde);
    }

    updatePortaalToestemming(verzorger: RVerzorger | undefined, waarde: boolean): void {
        if (!verzorger) return;
        this._toestemmingService.updatePortaalToestemming(getEntiteitId(verzorger), waarde);
    }
}
