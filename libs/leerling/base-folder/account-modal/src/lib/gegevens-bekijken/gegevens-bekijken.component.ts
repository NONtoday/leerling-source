import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import { IconDirective } from 'harmony';
import { IconBeheer, IconBewerken, provideIcons } from 'harmony-icons';
import { SomtodayAccountProfiel } from 'leerling-authentication';
import { StackedAvatarComponent } from 'leerling-avatar';
import { environment } from 'leerling-environment';
import { HeeftRechtDirective } from 'leerling/store';
import { AccountModel } from '../gegevens/service/gegevens.service';

@Component({
    selector: 'sl-gegevens-bekijken',
    standalone: true,
    imports: [CommonModule, StackedAvatarComponent, IconDirective, HeeftRechtDirective],
    templateUrl: './gegevens-bekijken.component.html',
    styleUrls: ['./gegevens-bekijken.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconBeheer, IconBewerken)]
})
export class GegevensBekijkenComponent {
    @Input() public profiel: SomtodayAccountProfiel | undefined;
    @Input() public account: AccountModel;
    public gegevensBewerken = output<void>();

    public changePassword(gebruikersnaam: string, organisatieUuid?: string) {
        const username = btoa(gebruikersnaam);
        const UUID = btoa(organisatieUuid ?? '');
        const callback = btoa(environment.ownBaseUri);
        window.location.assign(`${environment.idpIssuer}/changepassword?username=${username}&UUID=${UUID}&callback=${callback}`);
    }
}
