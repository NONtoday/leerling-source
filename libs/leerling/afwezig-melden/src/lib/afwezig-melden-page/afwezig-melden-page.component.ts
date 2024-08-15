import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { createModalSettings, DeviceService, isPresent, ModalService, SpinnerComponent } from 'harmony';
import { SchoolContactgegevensComponent } from 'leerling-account-modal';
import { AuthenticationService } from 'leerling-authentication';
import { registerContextSwitchInterceptor, TabBarComponent } from 'leerling-base';
import { REloRestricties } from 'leerling-codegen';
import { HeaderComponent, ScrollableTitleComponent } from 'leerling-header';
import { GeenDataComponent, onRefreshOrRedirectHome } from 'leerling-util';
import { PlaatsingService, RechtenService } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { delay, distinctUntilChanged, filter, finalize, map, Observable, of, Subject, switchMap, take } from 'rxjs';
import { AfwezigMeldenWizardComponent } from '../afwezig-melden-wizard/afwezig-melden-wizard.component';
import { AbsentieService } from '../services/absentie.service';

@Component({
    selector: 'sl-afwezig-melden-page',
    standalone: true,
    imports: [
        AfwezigMeldenWizardComponent,
        HeaderComponent,
        TabBarComponent,
        ScrollableTitleComponent,
        SchoolContactgegevensComponent,
        SpinnerComponent,
        GeenDataComponent
    ],
    providers: [AbsentieService],
    templateUrl: './afwezig-melden-page.component.html',
    styleUrl: './afwezig-melden-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AfwezigMeldenPageComponent {
    private absentieService = inject(AbsentieService);
    private authenticationService = inject(AuthenticationService);
    private deviceService = inject(DeviceService);
    private modalService = inject(ModalService);
    private plaatsingService = inject(PlaatsingService);
    private rechtenService = inject(RechtenService);
    private _destroyRef = inject(DestroyRef);

    private leerling$ = this.authenticationService.currentAccountLeerling$.pipe(
        map(({ leerling }) => leerling),
        filter(isPresent)
    );

    private heeftAfwezigMeldenFeatureRechten$ = this.leerling$.pipe(
        takeUntilDestroyed(this._destroyRef),
        switchMap(() => this.rechtenService.getCurrentAccountRechten()),
        map((rechten) => !!rechten[AfwezigMeldenFeatureRecht])
    );

    private absentieRedenen$ = this.heeftAfwezigMeldenFeatureRechten$.pipe(
        takeUntilDestroyed(this._destroyRef),
        switchMap((heeftRechten) => (heeftRechten ? this.plaatsingService.getHuidigeVestiging() : of(undefined))),
        distinctUntilChanged(),
        filter(isPresent),
        switchMap((vestiging) => this.absentieService.absentieRedenen(vestiging.id)),
        filter(isPresent)
    );

    leerling = toSignal(this.leerling$);
    heeftAfwezigMeldenFeatureRechten = toSignal(this.heeftAfwezigMeldenFeatureRechten$);
    absentieRedenen = toSignal(this.absentieRedenen$);

    finishedLoading = computed(() => this.leerling() && (!this.heeftAfwezigMeldenFeatureRechten() || this.absentieRedenen()));
    showWizard = computed(() => this.finishedLoading() && this.heeftAfwezigMeldenFeatureRechten() && !!this.absentieRedenen()?.length);
    isPhoneOrTabletPortrait = derivedAsync(() => this.deviceService.isPhoneOrTabletPortrait$);
    wizardIsDirty = signal<boolean>(false); // 🧙🏻‍♂️🛁

    readonly pageTitle = 'Afwezig melden';

    constructor() {
        onRefreshOrRedirectHome([AfwezigMeldenFeatureRecht]);
        registerContextSwitchInterceptor(() => this.canDeactivate());
    }

    public canDeactivate(): Observable<boolean> {
        if (!this.heeftAfwezigMeldenFeatureRechten()) return of(true);
        if (this.wizardIsDirty()) {
            // in sommige gevallen kan een andere modal open zijn, bijv. bij leerling switch op mobile
            if (this.modalService.isOpen()) {
                const modalCloseSubject = new Subject<void>();
                this.modalService.onClose(() => {
                    modalCloseSubject.next();
                    modalCloseSubject.complete();
                });
                this.modalService.animateAndClose();
                return modalCloseSubject.pipe(
                    take(1),
                    // delay nodig omdat de close flow een setTimeout gebruikt
                    delay(1),
                    switchMap(() => this.showConfirmModal())
                );
            }
            return this.showConfirmModal();
        }
        return of(true);
    }

    private showConfirmModal(): Observable<boolean> {
        return this.modalService
            .confirmModal(
                {
                    text: 'Wil je stoppen met afwezig melden? De reeds ingevoerde informatie gaat verloren.',
                    annulerenButtonText: 'Nee, ik wil door',
                    bevestigenButtonText: 'Ja, stoppen',
                    bevestigenButtonMode: 'delete'
                },
                createModalSettings({
                    title: 'Afwezig melden stoppen',
                    titleIcon: 'waarschuwing',
                    titleIconColor: 'action-negative-normal',
                    widthModal: '420px'
                })
            )
            .confirmResult.pipe(
                map((result) => result === 'Positive'),
                finalize(() => false)
            );
    }
}

const AfwezigMeldenFeatureRecht: keyof REloRestricties = 'absentiesBekijkenAan';
