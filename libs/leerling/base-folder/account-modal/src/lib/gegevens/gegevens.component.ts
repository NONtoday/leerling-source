import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output, signal, viewChild } from '@angular/core';
import { SpinnerComponent } from 'harmony';
import { IconBewerken, provideIcons } from 'harmony-icons';
import { AuthenticationService, SomtodayAccountProfiel } from 'leerling-authentication';
import { derivedAsync } from 'ngxtension/derived-async';
import { combineLatest, map } from 'rxjs';
import { GegevensBekijkenComponent } from '../gegevens-bekijken/gegevens-bekijken.component';
import { GegevensBewerkenComponent } from '../gegevens-bewerken/gegevens-bewerken.component';
import { AccountModel, GegevensService } from './service/gegevens.service';

export interface ProfielAccount {
    profiel: SomtodayAccountProfiel | undefined;
    account: AccountModel;
}

type State = 'bekijken' | 'bewerken';

@Component({
    selector: 'sl-gegevens',
    imports: [CommonModule, GegevensBekijkenComponent, GegevensBewerkenComponent, SpinnerComponent],
    templateUrl: './gegevens.component.html',
    styleUrls: ['./gegevens.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconBewerken)]
})
export class GegevensComponent {
    private _gegevensBewerken = viewChild(GegevensBewerkenComponent);
    private _gegevensService = inject(GegevensService);
    private _authenticationService = inject(AuthenticationService);

    title = output<string>();

    public huidigProfielEnAccount = derivedAsync(() =>
        combineLatest([this._authenticationService.currentProfiel$, this._gegevensService.getCurrentAccount$()]).pipe(
            map(([profiel, account]) => {
                return {
                    profiel,
                    account
                };
            })
        )
    );
    public state = signal<State>('bekijken');
    public isVerzorger = this._authenticationService.isCurrentContextOuderVerzorger;

    public changeState(state: State) {
        this.title.emit(state === 'bekijken' ? 'Mijn gegevens' : 'Gegevens bewerken');
        this.state.set(state);
    }

    /**
     * @returns true als de actie al afgehandeld is, anders false.
     */
    public onHeaderTerug(): boolean {
        if (this._gegevensBewerken()?.isSubmitting()) return true;
        if (this.state() === 'bewerken') {
            this.changeState('bekijken');
            return true;
        }
        return false;
    }
}
