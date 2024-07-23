import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ToggleComponent } from 'harmony';
import { WeergaveService } from './service/weergave.service';

@Component({
    selector: 'sl-weergave',
    standalone: true,
    imports: [CommonModule, FormsModule, ToggleComponent],
    templateUrl: './weergave.component.html',
    styleUrls: ['./weergave.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeergaveComponent {
    private _weergaveService = inject(WeergaveService);
    public selectedTheme = toSignal(this._weergaveService.getSelectedTheme$(), { initialValue: 'light' });
    public systeemVoorkeur = toSignal(this._weergaveService.getSysteemVoorkeur$(), { initialValue: true });
    public dyslexieLettertype = toSignal(this._weergaveService.getDyslexieLettertype$(), { initialValue: false });
    public onvoldoendeRood = toSignal(this._weergaveService.getToonOnvoldoendeRood$(), { initialValue: false });

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
}
