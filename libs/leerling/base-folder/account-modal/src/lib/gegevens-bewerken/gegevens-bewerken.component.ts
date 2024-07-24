import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input, OnInit, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent, IconDirective } from 'harmony';
import { IconNoRadio, provideIcons } from 'harmony-icons';
import { isEqual } from 'lodash-es';
import { AccountModel, GegevensService } from '../gegevens/service/gegevens.service';

@Component({
    selector: 'sl-gegevens-bewerken',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, IconDirective, ButtonComponent],
    templateUrl: './gegevens-bewerken.component.html',
    styleUrls: ['./gegevens-bewerken.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconNoRadio)]
})
export class GegevensBewerkenComponent implements OnInit {
    private _gegevensService = inject(GegevensService);
    private _formBuilder = inject(FormBuilder);

    public gegevensForm: FormGroup;

    @Input() public data: AccountModel;
    bekijken = output<boolean>();

    ngOnInit() {
        this.gegevensForm = this._formBuilder.group({
            telefoonnummer: [{ value: this.data.telnummer, disabled: true }],
            mobielnummer: [
                { value: this.data.mobielnummer, disabled: !this.data.mobielWijzigenAan },
                [Validators.pattern(/(^\+[0-9]{2}|^\+[0-9]{2}\(0\)|^\(\+[0-9]{2}\)\(0\)|^00[0-9]{2}|^0)([0-9]{9}$|[0-9-]{10}$)/)]
            ],
            werknummer: [
                { value: this.data.werknummer, disabled: !this.data.mobielWijzigenAan },
                [Validators.pattern(/(^\+[0-9]{2}|^\+[0-9]{2}\(0\)|^\(\+[0-9]{2}\)\(0\)|^00[0-9]{2}|^0)([0-9]{9}$|[0-9-]{10}$)/)]
            ],
            email: [
                {
                    value: this.data.eMail,
                    disabled:
                        !this.data.emailWijzigenAan ||
                        isEqual(this.data.gebruikersnaam.toLocaleLowerCase(), this.data.eMail?.toLocaleLowerCase())
                },
                [Validators.pattern(/^[_A-Za-z0-9-]+(\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*((\.[A-Za-z]{2,}){1}$)/)]
            ]
        });
    }

    onSubmit() {
        if (!this.gegevensForm.valid) {
            return;
        }
        this.isVerzorger
            ? this._gegevensService.updateContactGegevensVerzorger(
                  this.mobielNummer?.value.trim(),
                  this.mobielWerkNummer?.value.trim(),
                  this.emailAdres?.value.trim()
              )
            : this._gegevensService.updateContactGegevensLeerling(this.mobielNummer?.value.trim(), this.emailAdres?.value.trim());
        this.toggleView(true);
    }

    public toggleView(value: boolean) {
        this.bekijken.emit(value);
    }

    get isVerzorger(): boolean {
        return this.data?.leerlingnummer === '' && this.data?.geboortedatum === '';
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
