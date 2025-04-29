import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Store } from '@ngxs/store';
import { collapseOnLeaveAnimation, expandOnEnterAnimation } from 'angular-animations';
import { differenceInDays, endOfDay, getISOWeek } from 'date-fns';
import {
    ButtonComponent,
    CheckboxComponent,
    HmyDatePipe,
    IconDirective,
    IconPillComponent,
    PillComponent,
    SpinnerComponent,
    TagComponent
} from 'harmony';
import {
    IconCheck,
    IconChevronLinks,
    IconHuiswerk,
    IconInbox,
    IconInleveropdracht,
    IconKalenderDag,
    IconKlok,
    IconLesstof,
    IconPijlLinks,
    IconSluiten,
    IconTijd,
    IconToets,
    IconToetsGroot,
    provideIcons
} from 'harmony-icons';
import { AuthenticationService } from 'leerling-authentication';
import { BijlageComponent, HtmlContentComponent } from 'leerling-base';
import { ConnectGebruikService } from 'leerling-connect';
import {
    createModalSettings,
    createSidebarSettings,
    FULL_SCREEN_MET_MARGIN,
    ModalSettings,
    SidebarService,
    SidebarSettings,
    SlTwoDatePipe
} from 'leerling-util';
import { SExternmateriaal, SStudiewijzerItem, ToggleAfgevinkt } from 'leerling/store';
import { isEmpty } from 'lodash-es';
import { InleveropdrachtCategorieIconColorPipe } from '../inleveropdracht/pipes/inleveropdracht-categorie-icon-color.pipe';
import { InleveropdrachtCategorieIconNamePipe } from '../inleveropdracht/pipes/inleveropdracht-categorie-icon-name.pipe';
import { InleveropdrachtCategorieToStringPipe } from '../inleveropdracht/pipes/inleveropdracht-categorie-to-string.pipe';
import { StudiewijzerItemIconColorPipe } from '../pipes/studiewijzer-item-icon-color.pipe';
import { StudiewijzerItemIconPipe } from '../pipes/studiewijzer-item-icon.pipe';
import { isDeadlineVerstreken } from '../studiewijzer-item/studiewijzer-item.util';

const ANIMATIONS = [expandOnEnterAnimation(), collapseOnLeaveAnimation()];

@Component({
    selector: 'sl-studiewijzer-item-instructie',
    imports: [
        CommonModule,
        IconDirective,
        CheckboxComponent,
        HtmlContentComponent,
        StudiewijzerItemIconPipe,
        BijlageComponent,
        TagComponent,
        PillComponent,
        ButtonComponent,
        IconPillComponent,
        InleveropdrachtCategorieIconColorPipe,
        InleveropdrachtCategorieIconNamePipe,
        InleveropdrachtCategorieToStringPipe,
        SpinnerComponent
    ],
    templateUrl: './studiewijzer-item-instructie.component.html',
    styleUrl: './studiewijzer-item-instructie.component.scss',
    animations: ANIMATIONS,
    providers: [
        provideIcons(
            IconChevronLinks,
            IconSluiten,
            IconInleveropdracht,
            IconHuiswerk,
            IconToets,
            IconToetsGroot,
            IconLesstof,
            IconPijlLinks,
            IconKlok,
            IconKalenderDag,
            IconTijd,
            IconCheck,
            IconInbox
        )
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[style.--icon-color]': 'iconColorCss()'
    }
})
export class StudiewijzerItemInstructieComponent {
    private _sidebarService = inject(SidebarService);
    private _connectGerbruikService = inject(ConnectGebruikService);
    private _store = inject(Store);
    private _authenticationService = inject(AuthenticationService);

    private _datePipe = new HmyDatePipe();
    private _twoDatePipe = new SlTwoDatePipe();

    public item = input.required<SStudiewijzerItem>();
    public toonInleverenKnop = input.required<boolean>();

    public bestandenInleveren = output();

    // Na afvinken wordt deze via de store vanuit de parent bijgewerkt.
    public afgevinkt = computed(() => this.item().gemaakt);
    public trottleTimeout = 500;

    public isLeerlingContext = this._authenticationService.isCurrentContextLeerling;
    public afvinkenToegestaan = computed(() => this.isLeerlingContext && this.item().huiswerkType !== 'LESSTOF');

    private _iconColorPipe = new StudiewijzerItemIconColorPipe();
    public iconColor = computed(() => {
        return this._iconColorPipe.transform(this.item(), this.afgevinkt());
    });
    public iconColorCss = computed(() => `var(--${this.iconColor()})`);

    public toonProjectgroepLeerlingen = signal(false);

    public state = computed(() => ({ saving: signal(false) }));

    public typeOmschrijving = computed(() => {
        if (this.item().isInleveropdracht) return 'Inleveropdracht';

        switch (this.item().huiswerkType) {
            case 'LESSTOF':
                return 'Lesstof';
            case 'TOETS':
                return 'Toets';
            case 'GROTE_TOETS':
                return 'Grote toets';
            default:
                return 'Huiswerk';
        }
    });

    public heeftInhoud = computed(() => {
        const item = this.item();
        return item
            ? !isEmpty(item.leerdoelen) ||
                  !isEmpty(item.omschrijving) ||
                  !isEmpty(item.notitie) ||
                  item.bijlagen.length > 0 ||
                  item.externeMaterialen.length > 0
            : false;
    });

    public datum = computed(() => {
        const item = this.item();

        if (item.inlevermoment) {
            return this._twoDatePipe.transform(item.inlevermoment.start, item.inlevermoment.eind, true);
        }

        if (item.swiToekenningType === 'WEEK') {
            const week = getISOWeek(item.datumTijd);
            return `Week ${week}, ${this._datePipe.transform(item.datumTijd, 'week_begin_dag_tm_eind_dag_maand_kort')}`;
        }
        return this._datePipe.transform(item.datumTijd, 'dag_uitgeschreven_dagnummer_maand');
    });

    public inlevermomentWaarschuwing = computed(() => {
        const item = this.item();
        if (!item.inlevermoment) return undefined;

        const aantalDagen = differenceInDays(endOfDay(item.inlevermoment.eind), endOfDay(new Date()));
        if (aantalDagen < 0) return undefined;

        return aantalDagen === 0 ? 'Vandaag' : `Nog ${aantalDagen} ${aantalDagen > 1 ? 'dagen' : 'dag'}`;
    });

    public toggleAfgevinkt() {
        if (!this.afvinkenToegestaan() || this.state().saving()) return;
        this.state().saving.set(true);
        this._store.dispatch(new ToggleAfgevinkt(this.item())).subscribe(() => {
            this.state().saving.set(false);
        });
    }

    public toggleAfgevinktCheckbox(event: Event) {
        event.stopPropagation();
        this.toggleAfgevinkt();
    }

    public registreerTekstLink(url: string) {
        const item = this.item();
        this._connectGerbruikService.registreerTekstLink(item.studiewijzerId, item.id, url);
    }

    public registreerExternMateriaal(materiaal: SExternmateriaal) {
        const item = this.item();
        this._connectGerbruikService.registreerExternMateriaal(item.studiewijzerId, item.id, materiaal.id, materiaal.uri);
    }

    public sluiten() {
        this._sidebarService.animateAndClose();
    }

    public terug() {
        this._sidebarService.backWithAnimation();
    }

    public static getModalSettings(): ModalSettings {
        return createModalSettings({
            contentPadding: 0,
            maxHeightRollup: FULL_SCREEN_MET_MARGIN
        });
    }

    public static getSidebarSettings(huiswerk: SStudiewijzerItem): SidebarSettings {
        return createSidebarSettings({
            title: huiswerk.vak?.naam ?? 'Details',
            headerDevice: 'none'
        });
    }

    public teLaat = computed(() => {
        return isDeadlineVerstreken(this.item());
    });
}
