import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IconDirective, ToggleComponent } from 'harmony';
import { IconPersoon, provideIcons } from 'harmony-icons';
import { AuthenticationService } from 'leerling-authentication';
import { WeergaveService } from './service/weergave.service';

@Component({
    selector: 'sl-weergave',
    standalone: true,
    imports: [CommonModule, FormsModule, ToggleComponent, IconDirective],
    providers: [provideIcons(IconPersoon)],
    templateUrl: './weergave.component.html',
    styleUrls: ['./weergave.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeergaveComponent {
    private _weergaveService = inject(WeergaveService);
    private _authenticationService = inject(AuthenticationService);
    public selectedTheme = toSignal(this._weergaveService.getSelectedTheme$(), { initialValue: 'light' });
    public systeemVoorkeur = toSignal(this._weergaveService.getSysteemVoorkeur$(), { initialValue: true });
    public dyslexieLettertype = toSignal(this._weergaveService.getDyslexieLettertype$(), { initialValue: false });
    public onvoldoendeRood = toSignal(this._weergaveService.getToonOnvoldoendeRood$(), { initialValue: false });
    public profielfotoVerbergen = toSignal(this._weergaveService.getProfielFotoVerbergen$(), { initialValue: false });

    public toggleThemeLight() {
        this._weergaveService.setTheme('light');
    }

    public toggleThemeDark() {
        this._weergaveService.setTheme('dark');
    }

    public toggleDyslexieLettertype() {
        this._weergaveService.toggleDyslexieLettertype();
    }

    public toggleSysteemVoorkeur() {
        this._weergaveService.toggleSysteemVoorkeur();
    }

    public toggleToonOnvoldoendesRood() {
        this._weergaveService.toggleToonOnvoldoendesRood();
    }

    public toggleProfielfotoVerbergen() {
        this._weergaveService.toggleProfielfotoVerbergen();
    }

    public isOuder = this._authenticationService.isCurrentContextOuderVerzorger;
}
