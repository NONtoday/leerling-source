import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
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

import { RouterService } from 'leerling-base';
import { BerichtActiesComponent, BerichtComponent } from 'leerling-berichten-api';
import { HeaderActionButtonComponent, injectHeaderConfig } from 'leerling-header';
import { StudiewijzerItemComponent } from 'leerling-studiewijzer-api';
import { SConversatie } from 'leerling/store';

import { last } from 'lodash-es';
import { computedPrevious } from 'ngxtension/computed-previous';
import { filter } from 'rxjs';
import { match } from 'ts-pattern';
import { BerichtService } from '../../../services/bericht.service';
import { BerichtSeperatorComponent } from '../bericht-seperator/bericht-seperator.component';
import { BerichtenTabLink } from '../berichten.component';
import { meestRecentRelevanteBericht, nieuwereBerichten, ongelezenBerichten } from './../../../services/conversatie.service';

export const TAGNAME_BERICHT_DETAIL = 'sl-bericht-detail';
@Component({
    selector: TAGNAME_BERICHT_DETAIL,
    imports: [
        CommonModule,
        BerichtComponent,
        BerichtActiesComponent,
        HeaderActionButtonComponent,
        BerichtSeperatorComponent,
        StudiewijzerItemComponent
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
    studiewijzerItemComponentRef = viewChild(StudiewijzerItemComponent, { read: ElementRef });

    private router = inject(Router);
    private injector = inject(Injector);
    private berichtService = inject(BerichtService);

    private _routerService = inject(RouterService);

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
            onBackButtonClick: () => {
                this.router.navigate([], { queryParams: { conversatie: undefined } });
            },
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

    onInleverperiodeStudiewijzeritemClick() {
        const studiewijzerItem = this.conversatie().studiewijzerItemVanInleverperiode;
        if (!studiewijzerItem) return;

        this._routerService.routeToStudiewijzer(studiewijzerItem.id, studiewijzerItem.datumTijd, 'Reacties');
    }
}
