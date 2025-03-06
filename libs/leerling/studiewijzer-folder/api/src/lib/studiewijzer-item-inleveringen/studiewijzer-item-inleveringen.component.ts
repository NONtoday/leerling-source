import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal, Signal, viewChild, WritableSignal } from '@angular/core';
import { BijlageComponent } from '@shared/uploadfile/ui';
import { differenceInDays, isAfter, isEqual, startOfDay } from 'date-fns';
import { ButtonComponent, IconDirective, IconPillComponent, PillComponent } from 'harmony';
import { IconCheck, IconInbox, IconInformatie, IconKalenderDag, IconSlot, IconTijd, provideIcons } from 'harmony-icons';
import { SlDatePipe, windowOpen } from 'leerling-util';
import { InleveropdrachtCategorie, InleveropdrachtListService, InleveropdrachtService, SInlevering, SInlevermoment } from 'leerling/store';
import { Observable } from 'rxjs';
import { HeropendeInleveringenComponent } from '../heropende-inleveringen/heropende-inleveringen.component';
import { InleverenComponent } from '../inleveren.component.ts/inleveren.component';
import { InleveringOndertitelPipe } from '../inlevering/inlevering-ondertitel.pipe';
import { InleveropdrachtCategorieIconColorPipe } from '../inleveropdracht/pipes/inleveropdracht-categorie-icon-color.pipe';
import { InleveropdrachtCategorieIconNamePipe } from '../inleveropdracht/pipes/inleveropdracht-categorie-icon-name.pipe';
import { InleveropdrachtCategorieToStringPipe } from '../inleveropdracht/pipes/inleveropdracht-categorie-to-string.pipe';

export type InleveropdrachtStatus = 'Aankomend' | 'In te leveren' | 'In afwachting' | 'Akkoord';

export type RInleveropdrachtStatus = 'TE_BEOORDELEN' | 'IN_BEHANDELING' | 'AKKOORD' | 'HEROPEND';

export interface HeropendMoment {
    datum: Date;
    inleveringen: SInlevering[];
}

@Component({
    selector: 'sl-studiewijzer-item-inleveringen',
    imports: [
        CommonModule,
        IconDirective,
        IconPillComponent,
        PillComponent,
        BijlageComponent,
        HeropendeInleveringenComponent,
        InleverenComponent,
        ButtonComponent,
        InleveringOndertitelPipe,
        InleveropdrachtCategorieToStringPipe,
        InleveropdrachtCategorieIconColorPipe,
        InleveropdrachtCategorieIconNamePipe
    ],
    templateUrl: './studiewijzer-item-inleveringen.component.html',
    styleUrl: './studiewijzer-item-inleveringen.component.scss',
    providers: [provideIcons(IconKalenderDag, IconTijd, IconCheck, IconInbox, IconSlot, IconInformatie)],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerItemInleveringenComponent {
    private _inleveropdrachtService = inject(InleveropdrachtService);
    private _inleveropdrachtListService = inject(InleveropdrachtListService);

    public categorie = input.required<InleveropdrachtCategorie>();
    public inlevermoment = input.required<SInlevermoment>();
    public inleveringen = input.required<SInlevering[]>();
    public aantalInleveringenInVerwerking = input.required<number>();
    public toekenningId = input.required<number>();
    public toonInleverenKnop = input.required<boolean>();
    public turnitInEulaUrl = input.required<string | undefined>();

    private _inleverenComponent = viewChild(InleverenComponent);

    private _datePipe = new SlDatePipe();

    public modus: WritableSignal<'informatie' | 'inleveren'> = signal('informatie');

    public datum = computed(() => {
        const format = 'dag_kort_dagnummer_maand_kort_tijd';
        return `${this._datePipe.transform(this.inlevermoment().start, format)} t/m ${this._datePipe.transform(this.inlevermoment().eind, format)}`;
    });

    public datumAriaLabel = computed(() => {
        let label = `Inlevermoment ${this.datum()}`;
        if (this.teLaat()) {
            label += ' - te laat';
        }
        return label;
    });

    public inVerwerkingOmschrijving = computed(() =>
        this.aantalInleveringenInVerwerking() > 1
            ? `Er worden ${this.aantalInleveringenInVerwerking()} bestanden verwerkt`
            : 'Er wordt één bestand verwerkt'
    );

    public inVerwerkingOndertitel = 'Je kunt deze pagina gerust sluiten, de verwerking gaat op de achtergrond verder.';

    public teLaat = computed(() =>
        this.inleveringen().length > 0
            ? isAfter(this.inleveringen()[0].verzendDatum, this.inlevermoment().eind)
            : isAfter(new Date(), this.inlevermoment().eind)
    );

    public inBehandeling = computed(() => this.inleveringen()[0]?.status === 'IN_BEHANDELING');
    public isAkkoord = computed(() => this.inleveringen()[0]?.status === 'AKKOORD');

    public deadlineWaarschuwing = computed(() => {
        const dagen = differenceInDays(startOfDay(this.inlevermoment().eind), startOfDay(new Date()));
        const status = this.inleveringen()[0]?.status;
        if (dagen < 0 || status === 'IN_BEHANDELING' || status === 'AKKOORD') return undefined;
        else if (dagen === 0) return 'Vandaag';
        else if (dagen === 1) return 'Morgen';
        else return `Over ${dagen} dagen`;
    });

    public heeftInleveringen = computed(() => this.inleveringen().length > 0);

    public huidigeInleveringen = computed(() => {
        if (!this.heeftInleveringen()) return [];
        const status = this.inleveringen()[0].status;
        if (status === 'HEROPEND') return [];
        const indexAfwijkendeStatus = this.inleveringen().findIndex((inlevering) => inlevering.status !== status);
        return indexAfwijkendeStatus === -1 ? this.inleveringen() : this.inleveringen().slice(0, indexAfwijkendeStatus);
    });

    public heeftHuidigeInleveringen = computed(() => this.huidigeInleveringen().length > 0);

    public heropendeMomenten: Signal<HeropendMoment[]> = computed(() =>
        this.inleveringen()
            .filter((inlevering) => inlevering.status === 'HEROPEND')
            .reduce(this.reduceHeropendInleveringen, [])
    );

    private reduceHeropendInleveringen = (momenten: HeropendMoment[], inlevering: SInlevering): HeropendMoment[] => {
        const bestaandMoment = momenten.find((moment) => isEqual(moment.datum, inlevering.statusWijzigingsDatum));
        if (bestaandMoment) {
            bestaandMoment.inleveringen.push(inlevering);
        } else {
            momenten.push({
                datum: inlevering.statusWijzigingsDatum,
                inleveringen: [inlevering]
            });
        }
        return momenten;
    };

    public setModusInleveren() {
        this.modus.set('inleveren');
    }

    public setModusInformatie() {
        this.modus.set('informatie');
    }

    public verwijderInlevering(inlevering: SInlevering) {
        this._inleveropdrachtService.verwijderInlevering(this.toekenningId(), this.inlevermoment().start, inlevering.id);
        this._inleveropdrachtListService.refreshInleverOpdrachten();
    }

    public openUrl(url: string | undefined) {
        if (url) windowOpen(url);
    }

    public canDeactivate(): Observable<boolean> | undefined {
        return this._inleverenComponent()?.canDeactivate();
    }
}
