import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconPillComponent, provideVakIcons } from 'harmony';
import { VakToIconPipe } from 'leerling-util';
import { SBoodschapCorrespondent } from 'leerling/store';

@Component({
    selector: 'sl-bericht-ontvanger-optie',
    imports: [CommonModule, IconPillComponent, VakToIconPipe],
    providers: [provideVakIcons],
    templateUrl: './bericht-ontvanger-optie.component.html',
    styleUrl: './bericht-ontvanger-optie.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.clickable]': 'clickable()'
    }
})
export class BerichtOntvangerOptieComponent {
    correspondent = input.required<SBoodschapCorrespondent>();
    clickable = input<boolean>(true);
    getoondeVakken = computed(() => this.correspondent().vakken.slice(0, 5));
}
