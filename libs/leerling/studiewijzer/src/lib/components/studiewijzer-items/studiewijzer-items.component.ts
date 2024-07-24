import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostBinding,
    HostListener,
    computed,
    effect,
    inject,
    input,
    signal
} from '@angular/core';
import { IconPillComponent } from 'harmony';
import { StudiewijzerItemComponent, sorteerStudiewijzerItems } from 'leerling-studiewijzer-api';
import { SidebarService } from 'leerling-util';
import { SStudiewijzerItem } from 'leerling/store';
import { StudiewijzerService } from '../../services/studiewijzer.service';
import { StudiewijzerItemTopPipe } from '../directives/studiewijzer-item-top.pipe';
import { StudiewijzerItemDetailComponent } from '../studiewijzer-item-detail/studiewijzer-item-detail.component';

const MIN_ITEMS_TO_STACK = 3;

@Component({
    selector: 'sl-studiewijzer-items',
    standalone: true,
    imports: [CommonModule, StudiewijzerItemComponent, IconPillComponent, StudiewijzerItemTopPipe],
    templateUrl: './studiewijzer-items.component.html',
    styleUrl: './studiewijzer-items.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudiewijzerItemsComponent {
    public items = input.required<SStudiewijzerItem[]>();
    public peildatum = input.required<Date>();
    public toonAfvinkKnop = input(true);
    public toonStacked = input(false);
    public neutralNoneBg = input(false);

    public canStack = computed(() => this.items().length >= MIN_ITEMS_TO_STACK);
    public isStacked = signal(false);

    @HostBinding('class.stacked') get stacked() {
        return this.isStacked();
    }

    @HostBinding('class.stackable') get stackable() {
        return this.canStack() && this.toonStacked();
    }

    private _elementRef = inject(ElementRef);
    private _studiewijzerService = inject(StudiewijzerService);
    private _sidebarService = inject(SidebarService);

    public sortedItems = computed(() => sorteerStudiewijzerItems([...this.items()]));

    constructor() {
        effect(
            () => {
                // Bij wisseling peildatum setStacked aanroepen, vandaar de &&
                this.peildatum() && this.setStacked();
                this._elementRef.nativeElement.style.setProperty('--aantal-items', this.items().length);
            },
            {
                allowSignalWrites: true
            }
        );
    }

    toggleAfgevinkt(item: SStudiewijzerItem) {
        this._studiewijzerService.toggleAfgevinkt(item);
    }

    toonDetails(item: SStudiewijzerItem) {
        if (this.isStacked()) return;
        this._sidebarService.push(
            StudiewijzerItemDetailComponent,
            computed(() => ({
                item: this.items().find((swi) => swi.id === item.id) ?? item
            })),
            StudiewijzerItemDetailComponent.getSidebarSettings(item)
        );
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
