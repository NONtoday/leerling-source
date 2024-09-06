import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SRegistratieCategorie } from 'leerling-registraties-models';
import { RegistratieComponent } from '../registratie/registratie.component';

// TODO: component verplaatsen naar template wanneer sidebar templateRefs ondersteund (want mini component)
@Component({
    selector: 'sl-registraties-list',
    standalone: true,
    imports: [CommonModule, RegistratieComponent, A11yModule],
    templateUrl: './registraties-list.component.html',
    styleUrl: './registraties-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistratiesListComponent {
    registratieCategorie = input.required<SRegistratieCategorie>();
}
