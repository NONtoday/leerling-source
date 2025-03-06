import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent, IconDirective, SpinnerComponent } from 'harmony';
import { IconNoRadio, provideIcons } from 'harmony-icons';
import { isEqual } from 'lodash-es';
import { from } from 'rxjs';
import { AccountModel, GegevensService } from '../gegevens/service/gegevens.service';

export const mobielNummerRegexPattern = Validators.pattern(
    /(^\+[0-9]{2}|^\+[0-9]{2}\(0\)|^\(\+[0-9]{2}\)\(0\)|^00[0-9]{2}|^0)([0-9]{9}$|[0-9-]{10}$)/
);

export const emailRegexPattern = Validators.pattern(
    /^[_A-Za-z0-9-]+(\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*((\.[A-Za-z]{2,}){1}$)/
);

@Component({
    selector: 'sl-gegevens-bewerken',
    imports: [CommonModule, ReactiveFormsModule, IconDirective, ButtonComponent, SpinnerComponent],
    templateUrl: './gegevens-bewerken.component.html',
    styleUrls: ['./gegevens-bewerken.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconNoRadio)]
})
export class GegevensBewerkenComponent implements OnInit {
    private _gegevensService = inject(GegevensService);
    private _formBuilder = inject(FormBuilder);
    private _destroyRef = inject(DestroyRef);

    public gegevensForm: FormGroup;

    public data = input.required<AccountModel>();
    public isVerzorger = input.required<boolean>();
    public bekijken = output<boolean>();

    isSubmitting = signal(false);

    ngOnInit() {
        this.gegevensForm = this._formBuilder.group({
            telefoonnummer: [{ value: this.data().telnummer, disabled: true }],
            mobielnummer: [{ value: this.data().mobielnummer, disabled: !this.data().mobielWijzigenAan }, [mobielNummerRegexPattern]],
            werknummer: [{ value: this.data().werknummer, disabled: !this.data().mobielWijzigenAan }, [mobielNummerRegexPattern]],
            email: [
                {
                    value: this.data().eMail,
                    disabled:
                        !this.data().emailWijzigenAan ||
                        isEqual(this.data().gebruikersnaam.toLocaleLowerCase(), this.data().eMail?.toLocaleLowerCase())
                },
                [emailRegexPattern]
            ]
        });
    }

    onSubmit() {
        if (!this.gegevensForm.valid) {
            return;
        }
        this.isSubmitting.set(true);
        from(
            this.isVerzorger()
                ? this._gegevensService.updateContactGegevensVerzorger(
                      this.mobielNummer?.value.trim(),
                      this.mobielWerkNummer?.value.trim(),
                      this.emailAdres?.value.trim()
                  )
                : this._gegevensService.updateContactGegevensLeerling(this.mobielNummer?.value.trim(), this.emailAdres?.value.trim())
        )
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe(() => {
                this.isSubmitting.set(false);
                this.toggleView(true);
            });
    }

    public toggleView(value: boolean) {
        this.bekijken.emit(value);
    }

    get mobielNummer() {
        return this.gegevensForm.get('mobielnummer');
    }

    get mobielWerkNummer() {
        return this.gegevensForm.get('werknummer');
    }

    get emailAdres() {
        return this.gegevensForm.get('email');
    }
}
