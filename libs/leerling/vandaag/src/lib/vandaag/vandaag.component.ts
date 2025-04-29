import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonComponent, HmyDatePipe, SpinnerComponent } from 'harmony';
import { IconSettings, provideIcons } from 'harmony-icons';
import { GegevensService } from 'leerling-account-modal';
import { getRestriction, ROOSTER, STUDIEWIJZER, TabBarComponent } from 'leerling-base';
import { REloRestricties } from 'leerling-codegen';
import { HeaderComponent } from 'leerling-header';
import { StudiemateriaalVakselectieComponent } from 'leerling-studiemateriaal';
import { SidebarService } from 'leerling-util';
import { RechtenService } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { map } from 'rxjs';

@Component({
    selector: 'sl-vandaag',
    imports: [HeaderComponent, HmyDatePipe, SpinnerComponent, TabBarComponent, ButtonComponent],
    templateUrl: './vandaag.component.html',
    styleUrls: ['./vandaag.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconSettings)]
})
export class VandaagComponent {
    private _router = inject(Router);
    private _gegevensService = inject(GegevensService);
    private _rechtenService = inject(RechtenService);

    public naam = derivedAsync(() => this._gegevensService.getCurrentAccount$().pipe(map((account) => account.naam.split(' ')[0])));
    public datum = new Date();
    private _sidebarService = inject(SidebarService);

    public openStudiemateriaal() {
        this._sidebarService.push(StudiemateriaalVakselectieComponent, {}, StudiemateriaalVakselectieComponent.getSidebarSettings());
    }

    constructor() {
        this._rechtenService
            .getCurrentAccountRechten()
            .pipe(
                takeUntilDestroyed(),
                map((accountRechten: REloRestricties) => {
                    // Als er het recht is om rooster of studiewijzer te bekijken is er geen vandaag tab. Dus redirect dan naar het rooster.
                    if (this.heeftRecht(accountRechten)) {
                        this._router.navigate(['']);
                    }
                })
            )
            .subscribe();
    }

    private heeftRecht(rechten: REloRestricties): boolean {
        return this.getRechten().some((recht) => rechten[recht]);
    }

    public getRechten(): (keyof REloRestricties)[] {
        return [getRestriction(ROOSTER), getRestriction(STUDIEWIJZER)];
    }
}
