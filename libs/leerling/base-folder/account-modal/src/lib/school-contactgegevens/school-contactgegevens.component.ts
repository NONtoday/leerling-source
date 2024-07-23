import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ButtonComponent, IconDirective } from 'harmony';
import { IconBericht, IconTelefoon, provideIcons } from 'harmony-icons';
import { derivedAsync } from 'ngxtension/derived-async';
import { GegevensService } from '../gegevens/service/gegevens.service';

@Component({
    selector: 'sl-school-contactgegevens',
    standalone: true,
    imports: [ButtonComponent, IconDirective],
    providers: [provideIcons(IconTelefoon, IconBericht)],
    templateUrl: './school-contactgegevens.component.html',
    styleUrl: './school-contactgegevens.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchoolContactgegevensComponent {
    private _gegevensService = inject(GegevensService);

    alwaysShowBorder = input(false);
    leerlingID = input.required<number>();
    title = input<string>();

    schoolgegevens = derivedAsync(() => this._gegevensService.getSchoolgegevens$());

    openUrl(url: string) {
        window.open(url, '_blank');
    }
}
