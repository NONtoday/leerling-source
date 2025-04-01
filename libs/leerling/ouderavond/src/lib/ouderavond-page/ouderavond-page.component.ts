import { ChangeDetectionStrategy, Component, computed, inject, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { createModalSettings, DeviceService, GeenDataComponent, isPresent, ModalService, SpinnerComponent } from 'harmony';
import { AuthenticationService } from 'leerling-authentication';
import { TabBarComponent } from 'leerling-base';
import { HeaderComponent, ScrollableTitleComponent } from 'leerling-header';
import { AccessibilityService, GuardableComponent, Wizard } from 'leerling-util';
import { derivedAsync } from 'ngxtension/derived-async';
import { injectParams } from 'ngxtension/inject-params';
import { delay, filter, finalize, map, Observable, of, Subject, switchMap, take, tap } from 'rxjs';
import { OuderavondWizardComponent } from '../ouderavond-wizard/ouderavond-wizard.component';
import { OuderavondService } from '../service/ouderavond.service';

@Component({
    selector: 'sl-ouderavond-page',
    imports: [OuderavondWizardComponent, HeaderComponent, TabBarComponent, ScrollableTitleComponent, SpinnerComponent, GeenDataComponent],
    templateUrl: './ouderavond-page.component.html',
    styleUrl: './ouderavond-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OuderavondPageComponent implements GuardableComponent, Wizard {
    @ViewChild('wizard') private _wizardComponent: OuderavondWizardComponent;
    private _authenticationService = inject(AuthenticationService);
    private _accessibilityService = inject(AccessibilityService);
    private _deviceService = inject(DeviceService);
    private _modalService = inject(ModalService);
    private _ouderavondService = inject(OuderavondService);

    public param = injectParams('id');

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    public ouderavondInfo = derivedAsync(() => this._ouderavondService.getOuderavondInfo(this.param()!));

    private leerling$ = this._authenticationService.currentAccountLeerling$.pipe(
        map(({ leerling }) => leerling),
        filter(isPresent)
    );

    leerling = toSignal(this.leerling$);

    isPhoneOrTabletPortrait = this._deviceService.isPhoneOrTabletPortraitSignal;
    wizardIsDirty = signal<boolean>(false); // 🧙🏻‍♂️🛁

    pageTitle = computed(() => `${this.ouderavondInfo()?.ouderavond.naam}, ${this.ouderavondInfo()?.leerlingNaam ?? ''}`);

    isAtFirstStep(): boolean {
        return this._wizardComponent?.isAtFirstStep() ?? true;
    }
    goToPreviousStep(): void {
        this._wizardComponent?.goToPreviousStep();
    }

    public canDeactivate(): Observable<boolean> {
        if (this.wizardIsDirty()) {
            // in sommige gevallen kan een andere modal open zijn, bijv. bij leerling switch op mobile

            if (this._modalService.isOpen()) {
                const modalCloseSubject = new Subject<void>();
                this._modalService.onClose(() => {
                    modalCloseSubject.next();
                    modalCloseSubject.complete();
                });
                this._modalService.animateAndClose();
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
        return this._modalService
            .confirmModal(
                {
                    text: 'Wil je stoppen met de inschrijving? De reeds ingevoerde informatie gaat verloren.',
                    annulerenButtonText: 'Nee, ik wil door',
                    bevestigenButtonText: 'Ja, stoppen',
                    bevestigenButtonMode: 'delete'
                },
                createModalSettings({
                    title: 'Inschrijven stoppen',
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
