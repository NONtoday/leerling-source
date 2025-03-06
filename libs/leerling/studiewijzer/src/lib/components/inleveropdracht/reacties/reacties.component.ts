import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent, createModalSettings, ModalService } from 'harmony';
import { AppStatusService } from 'leerling-app-status';
import { BerichtComponent } from 'leerling-berichten-api';
import { AccessibilityService } from 'leerling-util';
import { InleveropdrachtService, SInleverDetails, SStudiewijzerItem } from 'leerling/store';
import { map, Observable, of, tap } from 'rxjs';

@Component({
    selector: 'sl-reacties',
    imports: [CommonModule, ReactiveFormsModule, ButtonComponent, BerichtComponent],
    templateUrl: './reacties.component.html',
    styleUrl: './reacties.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReactiesComponent implements OnInit {
    private _inleveropdrachtService = inject(InleveropdrachtService);
    private _modalService = inject(ModalService);
    private _accessibilityService = inject(AccessibilityService);

    isOnline = inject(AppStatusService).isOnlineSignal();

    public item = input.required<SStudiewijzerItem>();
    public details = input.required<SInleverDetails>();

    placeholder = computed<string>(() =>
        this.item().isInProjectgroepen ? 'Stel een vraag aan je docent(en) en projectgroep' : 'Stel een vraag aan je docent(en)'
    );

    // Haakjes worden heel raar voorgelezen dus die halen we uit het aria-label.
    inhoudAriaLabel = computed<string>(() => 'Inhoud. ' + this.placeholder().replace('(', '').replace(')', ''));

    verstuurReactie = output<string>();

    form = new FormGroup({ inhoud: new FormControl('', Validators.required) });

    ngOnInit(): void {
        const boodschappen = this.details().conversatie;
        if (boodschappen.length > 0) {
            this._inleveropdrachtService.markReactiesAlsGelezen(boodschappen[0]);
        }
    }

    reageer() {
        if (this.form.valid && this.form.controls.inhoud.value) {
            this.form.markAsPristine();
            this.verstuurReactie.emit(this.form.controls.inhoud.value);
            this.form.reset();
        }
    }

    canDeactivate(): Observable<boolean> | undefined {
        if (this.form.pristine) {
            return of(true);
        }
        return this._modalService
            .confirmModal(
                {
                    text: 'Deze reactie is niet verzonden en wordt niet opgeslagen',
                    annulerenButtonText: 'Annuleren',
                    bevestigenButtonText: 'Reactie verwijderen',
                    bevestigenButtonMode: 'delete'
                },
                createModalSettings({
                    title: 'Je reactie is nog niet verstuurd',
                    widthModal: '460px',
                    cdkTrapFocusAutoCapture: this._accessibilityService.isAccessedByKeyboard()
                })
            )
            .confirmResult.pipe(
                map((result) => result === 'Positive'),
                tap((confirmed) => {
                    if (confirmed) this.reset();
                })
            );
    }

    private reset() {
        this.form.reset();
        this.form.markAsPristine();
    }
}
