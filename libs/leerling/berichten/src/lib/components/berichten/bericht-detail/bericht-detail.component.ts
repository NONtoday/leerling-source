import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Injector,
    OnInit,
    Output,
    TemplateRef,
    computed,
    effect,
    inject,
    input,
    runInInjectionContext,
    viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { collapseOnLeaveAnimation, expandOnEnterAnimation } from 'angular-animations';
import { TooltipDirective, VerwijderConfirmationComponent } from 'harmony';
import { HeaderActionButtonComponent, injectHeaderConfig } from 'leerling-header';
import { SConversatie } from 'leerling/store';
import { last } from 'lodash-es';
import { computedPrevious } from 'ngxtension/computed-previous';
import { filter } from 'rxjs';
import { match } from 'ts-pattern';
import { BerichtService } from '../../../services/bericht.service';
import { BerichtActiesComponent } from '../bericht-acties/bericht-acties.component';
import { BerichtSeperatorComponent } from '../bericht-seperator/bericht-seperator.component';
import { BerichtComponent } from '../bericht/bericht.component';
import { BerichtenTabLink } from '../berichten.component';
import { meestRecentRelevanteBericht, nieuwereBerichten, ongelezenBerichten } from './../../../services/conversatie.service';

export const TAGNAME_BERICHT_DETAIL = 'sl-bericht-detail';
@Component({
    selector: TAGNAME_BERICHT_DETAIL,
    standalone: true,
    imports: [
        CommonModule,
        BerichtComponent,
        VerwijderConfirmationComponent,
        TooltipDirective,
        BerichtActiesComponent,
        HeaderActionButtonComponent,
        BerichtSeperatorComponent
    ],
    templateUrl: './bericht-detail.component.html',
    styleUrl: './bericht-detail.component.scss',
    animations: [collapseOnLeaveAnimation(), expandOnEnterAnimation()],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        'aria-label': 'Bericht detail'
    },
    providers: [BerichtService]
})
export class BerichtDetailComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly injector = inject(Injector);
    private readonly berichtService = inject(BerichtService);

    tab = input.required<BerichtenTabLink>();
    conversatie = input.required<SConversatie>();
    ongelezenVanaf = input.required<Date | undefined>();

    @Output() markeerOngelezen = new EventEmitter<void>();
    @Output() verwijder = new EventEmitter<void>();

    headerActions = viewChild.required('headerActions', { read: TemplateRef });
    isThread = computed(() => this.conversatie().boodschappen.length > 1);

    meestRecentRelevanteBericht = computed(() => meestRecentRelevanteBericht(this.tab(), this.conversatie()));

    mainThread = computed(() =>
        match(this.tab())
            .with('postvak-in', () => ongelezenBerichten(this.conversatie(), this.ongelezenVanaf()))
            .with('verzonden-items', () => [this.meestRecentRelevanteBericht()])
            .exhaustive()
    );

    nieuwereBerichten = computed(() =>
        match(this.tab())
            .with('postvak-in', () => [])
            .with('verzonden-items', () => nieuwereBerichten(this.conversatie()))
            .exhaustive()
    );

    eerdereBerichten = computed(() => {
        const laatsteMainThreadBericht = last(this.mainThread());
        const vanafIndex = this.conversatie().boodschappen.findIndex((bood) => bood.id === laatsteMainThreadBericht?.id) ?? 0 + 1;
        return this.conversatie().boodschappen.slice(vanafIndex + 1);
    });

    seperatorLabel = computed(
        () => `${this.nieuwereBerichten().length} ${this.nieuwereBerichten().length === 1 ? 'nieuwer bericht' : 'nieuwere berichten'}`
    );
    showNieuwereBerichten = false;

    ngOnInit() {
        injectHeaderConfig({
            onBackButtonClick: () => this.router.navigate([], { queryParams: { conversatie: undefined } }),
            title: this.meestRecentRelevanteBericht().onderwerp,
            injector: this.injector,
            headerActions: this.headerActions
        });
        // computedPrevious moet in dit geval in de ngOnInit omdat anders de input van conversatie nog niet beschikbaar is
        runInInjectionContext(this.injector, () => {
            const previousConversatie = computedPrevious(this.conversatie);
            effect(() => {
                if (this.conversatie().id !== previousConversatie()?.id) {
                    this.showNieuwereBerichten = false;
                }
            });
        });
    }

    openVerwijderConfirm() {
        const modal = this.berichtService.createVerwijderDialog();

        modal?.confirmResult.pipe(filter((confirmResult) => confirmResult === 'Positive')).subscribe(() => this.verwijder.emit());
    }

    handleMeerOntvangersPillClick(boodschapId: number) {
        this.berichtService.getExtraOntvangersBoodschap(this.conversatie(), boodschapId);
    }
}
