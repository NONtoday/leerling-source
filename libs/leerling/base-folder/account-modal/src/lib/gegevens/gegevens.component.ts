import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { SpinnerComponent } from 'harmony';
import { IconBewerken, provideIcons } from 'harmony-icons';
import { AuthenticationService, SomtodayAccountProfiel } from 'leerling-authentication';
import { Observable, combineLatest, map } from 'rxjs';
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
    standalone: true,
    imports: [CommonModule, GegevensBekijkenComponent, GegevensBewerkenComponent, SpinnerComponent],
    templateUrl: './gegevens.component.html',
    styleUrls: ['./gegevens.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconBewerken)]
})
export class GegevensComponent implements OnInit {
    private _gegevensService = inject(GegevensService);
    private _authService = inject(AuthenticationService);

    public state = signal<State>('bekijken');
    public huidigProfielEnAccount: Observable<ProfielAccount>;

    title = output<string>();

    ngOnInit(): void {
        this.huidigProfielEnAccount = combineLatest([this._authService.currentProfiel$, this._gegevensService.getCurrentAccount$()]).pipe(
            map(([profiel, account]) => {
                return {
                    profiel,
                    account
                };
            })
        );
    }

    public changeState(state: State) {
        this.title.emit(state === 'bekijken' ? 'Mijn gegevens' : 'Gegevens bewerken');
        this.state.set(state);
    }

    /**
     * @returns true als de actie al afgehandeld is, anders false.
     */
    public onHeaderTerug(): boolean {
        if (this.state() === 'bewerken') {
            this.changeState('bekijken');
            return true;
        }
        return false;
    }
}
