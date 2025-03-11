import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { AvatarComponent, IconDirective, SpinnerComponent } from 'harmony';
import { IconPijlRechts, provideIcons } from 'harmony-icons';
import { GegevensService, SchoolContactgegevensComponent } from 'leerling-account-modal';
import { derivedAsync } from 'ngxtension/derived-async';

@Component({
    selector: 'sl-schoolgegevens',
    standalone: true,
    templateUrl: './schoolgegevens.component.html',
    styleUrls: ['./schoolgegevens.component.scss'],
    imports: [CommonModule, IconDirective, AvatarComponent, SchoolContactgegevensComponent, SpinnerComponent],
    providers: [provideIcons(IconPijlRechts)]
})
export class SchoolgegevensComponent {
    private _gegevensService = inject(GegevensService);

    isOuder = input.required<boolean>();
    leerlingInitialen = input.required<string>();
    leerlingFoto = input.required<string | undefined>();
    leerlingNaam = input.required<string>();
    leerlingID = input.required<number>();

    public schoolgegevens = derivedAsync(() => this._gegevensService.getSchoolgegevens$());
}
