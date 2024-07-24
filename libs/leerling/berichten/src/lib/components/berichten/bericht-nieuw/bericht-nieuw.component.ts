import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, ViewContainerRef, inject, input, output, viewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
    ButtonComponent,
    DeviceService,
    IconDirective,
    NotifyPopupModalComponent,
    OverlayService,
    createModalSettings,
    createPopupSettings
} from 'harmony';
import { IconVerzenden, provideIcons } from 'harmony-icons';
import { HeaderActionButtonComponent, HeaderComponent, ScrollableTitleComponent, injectHeaderConfig } from 'leerling-header';
import { NieuwBerichtInput, SMedewerker } from 'leerling/store';
import { BerichtService } from '../../../services/bericht.service';
import { BerichtOntvangerSelectieComponent } from '../bericht-ontvanger-selectie/bericht-ontvanger-selectie.component';

@Component({
    selector: 'sl-bericht-nieuw',
    standalone: true,
    imports: [
        CommonModule,
        ButtonComponent,
        FormsModule,
        ReactiveFormsModule,
        BerichtOntvangerSelectieComponent,
        HeaderComponent,
        HeaderActionButtonComponent,
        ScrollableTitleComponent,
        IconDirective
    ],
    templateUrl: './bericht-nieuw.component.html',
    styleUrl: './bericht-nieuw.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [BerichtService, provideIcons(IconVerzenden)],
    host: {
        '(window:keydown.escape)': 'clickAnnuleren()'
    }
})
export class BerichtNieuwComponent {
    private ontvangerSelectie = viewChild.required<BerichtOntvangerSelectieComponent>('ontvangerSelectie');
    private _router = inject(Router);
    private _overlayService = inject(OverlayService);
    private _viewContainerRef = inject(ViewContainerRef);

    public deviceService = inject(DeviceService);

    verstuurBericht = output<NieuwBerichtInput>();

    headerActions = viewChild('headerActions', { read: TemplateRef });

    isOnline = input.required<boolean>();

    form = new FormGroup({
        ontvangers: new FormControl(new Array<SMedewerker>(), Validators.required),
        onderwerp: new FormControl('', [Validators.required, Validators.maxLength(1024)]),
        inhoud: new FormControl('', [Validators.required])
    });

    constructor() {
        injectHeaderConfig({
            onBackButtonClick: this.clickAnnuleren,
            title: 'Nieuw bericht',
            headerActions: this.headerActions
        });
    }

    verzendBericht() {
        const errorMessage = this.getOntbrekekendeVeldenMessage();
        if (this.form.valid) {
            const formValue = this.form.value;
            if (!formValue.ontvangers || !formValue.inhoud || !formValue.onderwerp) {
                throw new Error('Angular formvalidatie mislukt');
            }
            this.form.markAsPristine();
            this.verstuurBericht.emit({
                inhoud: formValue.inhoud,
                ontvangerIds: formValue.ontvangers.map((ontvanger) => ontvanger.id),
                onderwerp: formValue.onderwerp
            });
        } else if (errorMessage) {
            this._overlayService.popupOrModal(
                NotifyPopupModalComponent,
                this._viewContainerRef,
                {
                    text: errorMessage.foutmelding,
                    buttonLabel: 'Sluiten',
                    sluitenClick: () => this._overlayService.close(this._viewContainerRef)
                },
                createPopupSettings(),
                createModalSettings({ title: errorMessage.titel })
            );
        }
    }

    formIsDirty = () => this.form.dirty;
    clickAnnuleren = () => {
        // Als de betrokkenenSelectie open is, dan moet de escape key eerst de selectie sluiten.
        if (!this._overlayService.isOpen(this.ontvangerSelectie().textInput())) {
            this._router.navigate([], { queryParams: {} });
        }
    };

    resetForm() {
        this.form.reset();
    }

    clickVerzenden() {
        if (this.form.valid && this.isOnline()) {
            this.verzendBericht();
        }
    }

    private getOntbrekekendeVeldenMessage(): ValidatieFout | null {
        const ontvangersVerplicht = this.form.controls.ontvangers.errors?.['required'];
        const onderwerpVerplicht = this.form.controls.onderwerp.errors?.['required'];
        const onderwerpTeLang = this.form.controls.onderwerp.errors?.['maxlength'];

        //TODO: Is ontvangers juiste taal voor de eindgebruiker?
        if (ontvangersVerplicht && onderwerpVerplicht) {
            return {
                titel: 'Ontvangers en onderwerp ontbreken',
                foutmelding: 'Vul een ontvanger en een onderwerp in om het bericht te verzenden'
            };
        }
        if (ontvangersVerplicht) {
            return {
                titel: 'Ontvangers ontbreken',
                foutmelding: 'Vul een ontvanger in om het bericht te verzenden'
            };
        }
        if (onderwerpVerplicht) {
            return {
                titel: 'Onderwerp ontbreekt',
                foutmelding: 'Vul een onderwerp in om het bericht te verzenden'
            };
        }
        if (onderwerpTeLang) {
            return {
                titel: 'Onderwerp te lang',
                foutmelding: 'Het onderwerp mag maximaal 1024 tekens bevatten'
            };
        }
        return null;
    }
}

type ValidatieFout = {
    titel: string;
    foutmelding: string;
};
