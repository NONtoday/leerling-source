import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Injector,
    OnInit,
    TemplateRef,
    computed,
    inject,
    input,
    output,
    signal,
    viewChild
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { collapseAnimation } from 'angular-animations';
import { AutoFocusDirective, ButtonComponent, TagComponent } from 'harmony';
import { BerichtComponent } from 'leerling-berichten-api';
import { HeaderActionButtonComponent, injectHeaderConfig } from 'leerling-header';
import { ReactieBerichtInput, SBoodschap, SConversatie } from 'leerling/store';
import { BerichtService } from '../../../services/bericht.service';
import { BerichtSeperatorComponent } from '../bericht-seperator/bericht-seperator.component';

@Component({
    selector: 'sl-bericht-beantwoorden',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TagComponent,
        ButtonComponent,
        BerichtComponent,
        HeaderActionButtonComponent,
        BerichtSeperatorComponent,
        AutoFocusDirective
    ],
    templateUrl: './bericht-beantwoorden.component.html',
    styleUrl: './bericht-beantwoorden.component.scss',
    animations: [collapseAnimation()],
    host: {
        '(window:keydown.escape)': 'annuleren()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BerichtBeantwoordenComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly injector = inject(Injector);
    private readonly berichtService = inject(BerichtService);

    reactieOpBericht = input.required<SBoodschap>();
    conversatie = input.required<SConversatie>();
    isOnline = input.required<boolean>();

    verstuurReactie = output<ReactieBerichtInput>();

    headerActions = viewChild.required('headerActions', { read: TemplateRef });

    form = new FormGroup({ inhoud: new FormControl('', Validators.required) });

    showEerdereBerichten = signal(false);
    eerdereBerichten = computed(() => {
        const berichtIndex = this.conversatie().boodschappen.findIndex((bericht) => bericht.id === this.reactieOpBericht().id);
        if (berichtIndex === -1) return [];
        return this.conversatie().boodschappen.slice(berichtIndex);
    });

    ngOnInit(): void {
        injectHeaderConfig({
            onBackButtonClick: this.annuleren,
            title: 'Beantwoorden',
            injector: this.injector,
            headerActions: this.headerActions
        });
    }

    // wordt aangeroepen bij check voor de guard.
    formIsDirty = () => this.form.dirty;

    resetForm() {
        this.form.reset();
        this.form.markAsPristine();
    }

    annuleren = () => {
        this.router.navigate([], { queryParams: { edit: null }, queryParamsHandling: 'merge' });
    };

    beantwoord() {
        if (this.form.valid && this.form.controls.inhoud.value) {
            this.form.markAsPristine();
            this.verstuurReactie.emit({
                reactieOpBerichtId: this.reactieOpBericht().id,
                inhoud: this.form.controls.inhoud.value
            });
        }
    }

    handleMeerOntvangersPillClick(boodschapId: number) {
        this.berichtService.getExtraOntvangersBoodschap(this.conversatie(), boodschapId);
    }
}
