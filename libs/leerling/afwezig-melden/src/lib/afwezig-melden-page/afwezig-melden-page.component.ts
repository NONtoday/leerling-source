import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { createModalSettings, DeviceService, GeenDataComponent, isPresent, ModalService, SpinnerComponent } from 'harmony';

import { AuthenticationService } from 'leerling-authentication';
import { AFWEZIG_MELDEN, getRestriction, registerContextSwitchInterceptor, TabBarComponent } from 'leerling-base';
import { HeaderComponent, ScrollableTitleComponent } from 'leerling-header';
import { AccessibilityService, GuardableComponent, onRefreshOrRedirectHome, Wizard } from 'leerling-util';
import { PlaatsingService, RechtenService } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { delay, distinctUntilChanged, filter, finalize, map, Observable, of, Subject, switchMap, take, tap } from 'rxjs';
import { AfwezigMeldenWizardComponent } from '../afwezig-melden-wizard/afwezig-melden-wizard.component';
import { AbsentieService } from '../services/absentie.service';

@Component({
    selector: 'sl-afwezig-melden-page',
    imports: [
        AfwezigMeldenWizardComponent,
        HeaderComponent,
        TabBarComponent,
        ScrollableTitleComponent,
        SpinnerComponent,
        GeenDataComponent
    ],
    providers: [AbsentieService],
    templateUrl: './afwezig-melden-page.component.html',
    styleUrl: './afwezig-melden-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AfwezigMeldenPageComponent implements GuardableComponent, Wizard {
    @ViewChild('wizard') private _wizardComponent: AfwezigMeldenWizardComponent;

    private absentieService = inject(AbsentieService);
    private authenticationService = inject(AuthenticationService);
    private deviceService = inject(DeviceService);
    private modalService = inject(ModalService);
    private plaatsingService = inject(PlaatsingService);
    private rechtenService = inject(RechtenService);
    private _destroyRef = inject(DestroyRef);
    private _accessibilityService = inject(AccessibilityService);

    private leerling$ = this.authenticationService.currentAccountLeerling$.pipe(
        map(({ leerling }) => leerling),
        filter(isPresent)
    );

    private heeftAfwezigMeldenFeatureRechten$ = this.leerling$.pipe(
        takeUntilDestroyed(this._destroyRef),
        switchMap(() => this.rechtenService.getCurrentAccountRechten()),
        map((rechten) => !!rechten[getRestriction(AFWEZIG_MELDEN)])
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
        onRefreshOrRedirectHome([getRestriction(AFWEZIG_MELDEN)]);
        registerContextSwitchInterceptor(() => this.canDeactivate());
    }

    isAtFirstStep(): boolean {
        return this._wizardComponent?.isAtFirstStep() ?? true;
    }
    goToPreviousStep(): void {
        this._wizardComponent?.goToPreviousStep();
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
                    bevestigenButtonMode: 'delete',
                    bevestigenButtonIcon: undefined
                },
                createModalSettings({
                    title: 'Afwezig melden stoppen',
                    titleIcon: 'waarschuwing',
                    titleIconColor: 'action-negative-normal',
                    widthModal: '420px',
                    cdkTrapFocusAutoCapture: this._accessibilityService.isAccessedByKeyboard()
                })
            )
            .confirmResult.pipe(
                map((result) => result === 'Positive'),
                tap((canClose) => {
                    if (canClose) {
                        this._wizardComponent?.markAsPristine();
                    }
                }),
                finalize(() => false)
            );
    }
}
