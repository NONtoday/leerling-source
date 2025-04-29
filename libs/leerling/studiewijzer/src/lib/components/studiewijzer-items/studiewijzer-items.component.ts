import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    HostBinding,
    HostListener,
    OnChanges,
    SimpleChanges,
    computed,
    inject,
    input,
    signal
} from '@angular/core';
import { outputFromObservable, toObservable } from '@angular/core/rxjs-interop';
import { IconPillComponent } from 'harmony';
import { StudiewijzerItemComponent, sorteerStudiewijzerItems } from 'leerling-studiewijzer-api';
import { SStudiewijzerItem } from 'leerling/store';
import { isEqual } from 'lodash-es';
import { StudiewijzerService } from '../../services/studiewijzer.service';
import { StudiewijzerItemTopPipe } from '../directives/studiewijzer-item-top.pipe';

const MIN_ITEMS_TO_STACK = 3;

@Component({
    selector: 'sl-studiewijzer-items',
    imports: [CommonModule, StudiewijzerItemComponent, IconPillComponent, StudiewijzerItemTopPipe],
    templateUrl: './studiewijzer-items.component.html',
    styleUrl: './studiewijzer-items.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[style.--aantal-items]': 'aantalItems()',
        '[class.view-init-ready]': 'isViewInitReady()'
    }
})
export class StudiewijzerItemsComponent implements OnChanges, AfterViewInit {
    public items = input.required<SStudiewijzerItem[]>();
    public peildatum = input.required<Date>();
    public toonAfvinkKnop = input(true);
    public toonStacked = input(false);
    public neutralNoneBg = input(false);
    public collapseStackOnPeildatumChange = input(true);

    public aantalItems = computed(() => this.items().length);
    public canStack = computed(() => this.aantalItems() >= MIN_ITEMS_TO_STACK);
    public isStacked = signal(false);

    public isViewInitReady = signal(false);

    // We willen de buitenwereld ook laten weten of we stacked/unstacked zijn.
    public isStackedOutput = outputFromObservable(toObservable(this.isStacked));

    @HostBinding('class.stacked') get stacked() {
        return this.isStacked();
    }

    @HostBinding('class.stackable') get stackable() {
        return this.canStack() && this.toonStacked();
    }

    private _studiewijzerService = inject(StudiewijzerService);

    public sortedItems = computed(() => sorteerStudiewijzerItems([...this.items()]));

    private _updateSetStacked = false;

    ngAfterViewInit(): void {
        this.isViewInitReady.set(true);
    }

    ngOnChanges(changes: SimpleChanges): void {
        // De stack moet geupdate worden als de peildatum veranderd is en de nieuwe items geladen zijn.
        // Het komt voor dat in changes eerst de peildatum geupdate wordt en in een latere change pas de items.
        // Om deze reden staan de change checks in losse statements
        const peildatumChanges = changes['peildatum'];
        if (peildatumChanges?.previousValue !== peildatumChanges?.currentValue && this.collapseStackOnPeildatumChange()) {
            this._updateSetStacked = true;
        }

        const items = changes['items'];
        // Vergelijk de items op id en datum/tijd.
        // We vergelijken bewust niet de hele studiewijzeritem, want dan verandert er iets bij het afvinken
        // van huiswerk.
        const vorigeItemIds = items?.previousValue
            ? // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
              (items.previousValue as SStudiewijzerItem[]).map((item) => item.id + '; ' + item.datumTijd).sort()
            : [];
        const huidigeItemIds = items?.currentValue
            ? // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
              (items.currentValue as SStudiewijzerItem[]).map((item) => item.id + '; ' + item.datumTijd).sort()
            : [];
        const zijnItemsGewijzigd = !isEqual(vorigeItemIds, huidigeItemIds);

        if ((this._updateSetStacked && this.collapseStackOnPeildatumChange()) || zijnItemsGewijzigd) {
            this._updateSetStacked = false;
            this.setStacked();
        }
    }

    toggleAfgevinkt(item: SStudiewijzerItem) {
        this._studiewijzerService.toggleAfgevinkt(item);
    }

    toonDetails(item: SStudiewijzerItem) {
        if (this.isStacked()) return;

        this._studiewijzerService.openSidebarMetStudiewijzerItem(item);
    }

    @HostListener('click', ['$event'])
    onClick(event: Event) {
        if (this.isStacked()) event.preventDefault();
        this.isStacked.set(false);
    }

    unstack(event: Event) {
        if (this.canStack()) {
            this.setStacked();
            event.stopPropagation();
        }
    }

    private setStacked() {
        this.isStacked.set(this.items().length >= MIN_ITEMS_TO_STACK && this.toonStacked());
    }
}
