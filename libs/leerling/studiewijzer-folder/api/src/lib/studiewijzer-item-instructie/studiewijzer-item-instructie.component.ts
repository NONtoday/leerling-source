import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, signal } from '@angular/core';
import { Store } from '@ngxs/store';
import { differenceInDays, endOfDay, getISOWeek } from 'date-fns';
import { CheckboxComponent, IconDirective, PillComponent, TagComponent } from 'harmony';
import {
    IconChevronLinks,
    IconHuiswerk,
    IconInleveropdracht,
    IconKalenderDag,
    IconKlok,
    IconLesstof,
    IconPijlLinks,
    IconSluiten,
    IconToets,
    IconToetsGroot,
    provideIcons
} from 'harmony-icons';
import { AuthenticationService } from 'leerling-authentication';
import { BijlageComponent, HtmlContentComponent } from 'leerling-base';
import { ConnectGebruikService } from 'leerling-connect';
import {
    FULL_SCREEN_MET_MARGIN,
    ModalSettings,
    SidebarService,
    SidebarSettings,
    SlDatePipe,
    SlTwoDatePipe,
    createModalSettings,
    createSidebarSettings
} from 'leerling-util';
import { SExternmateriaal, SStudiewijzerItem, ToggleAfgevinkt } from 'leerling/store';
import { isEmpty } from 'lodash-es';
import { StudiewijzerItemIconColorPipe } from '../pipes/studiewijzer-item-icon-color.pipe';
import { StudiewijzerItemIconPipe } from '../pipes/studiewijzer-item-icon.pipe';

@Component({
    selector: 'sl-studiewijzer-item-instructie',
    standalone: true,
    imports: [
        CommonModule,
        IconDirective,
        CheckboxComponent,
        HtmlContentComponent,
        StudiewijzerItemIconPipe,
        StudiewijzerItemIconColorPipe,
        BijlageComponent,
        TagComponent,
        PillComponent,
        SlDatePipe,
        SlTwoDatePipe
    ],
    templateUrl: './studiewijzer-item-instructie.component.html',
    styleUrl: './studiewijzer-item-instructie.component.scss',
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
            IconKalenderDag
        )
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerItemInstructieComponent {
    private _sidebarService = inject(SidebarService);
    private _connectGerbruikService = inject(ConnectGebruikService);
    private _elementRef = inject(ElementRef);
    private _store = inject(Store);
    private _authenticationService = inject(AuthenticationService);

    private _datePipe = new SlDatePipe();
    private _twoDatePipe = new SlTwoDatePipe();

    public item = input.required<SStudiewijzerItem>();

    public afgevinkt = signal(false);
    public afvinkenToegestaan = computed(
        () => !this._authenticationService.isCurrentContextOuderVerzorger && this.item().huiswerkType !== 'LESSTOF'
    );

    private _iconColorPipe = new StudiewijzerItemIconColorPipe();
    public iconColor = computed(() => {
        return this._iconColorPipe.transform(this.item(), this.afgevinkt());
    });

    constructor() {
        effect(() => this.afgevinkt.set(this.item().gemaakt), {
            allowSignalWrites: true
        });
        effect(() => this._elementRef.nativeElement.style.setProperty('--icon-color', `var(--${this.iconColor()}`));
    }

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
        if (!this.afvinkenToegestaan()) return;

        this.afgevinkt.set(!this.afgevinkt());
        this._store.dispatch(new ToggleAfgevinkt(this.item()));
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
            headerType: 'none'
        });
    }
}
