import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { AvatarComponent, GeenDataComponent, SpinnerComponent } from 'harmony';
import { derivedAsync } from 'ngxtension/derived-async';
import { VakantieService } from './service/vakantie.service';
import { VakantieSubtitlePipe } from './vakantie-subtitle.pipe';

@Component({
    selector: 'sl-vakanties',
    templateUrl: './vakanties.component.html',
    styleUrls: ['./vakanties.component.scss'],
    imports: [AvatarComponent, GeenDataComponent, CommonModule, VakantieSubtitlePipe, SpinnerComponent]
})
export class VakantiesComponent {
    private _vakantieService = inject(VakantieService);

    public vakanties = derivedAsync(() => this._vakantieService.getVakantiesHuidigSchooljaar());

    isOuder = input.required<boolean>();
    leerlingInitialen = input.required<string>();
    leerlingFoto = input.required<string | undefined>();
    leerlingNaam = input.required<string>();
}
