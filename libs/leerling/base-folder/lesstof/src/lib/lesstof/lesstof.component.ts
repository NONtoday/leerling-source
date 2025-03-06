import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    Injector,
    QueryList,
    ViewChildren,
    effect,
    inject,
    input,
    output
} from '@angular/core';
import { IconPillComponent, getIconVoorVak } from 'harmony';
import { IconChevronOnder, provideIcons } from 'harmony-icons';
import { StudiewijzerItemComponent, StudiewijzerItemInstructieComponent } from 'leerling-studiewijzer-api';
import { AccessibilityService, SidebarService, createSidebarSettings } from 'leerling-util';
import { SStudiewijzerItem, SVak } from 'leerling/store';
import { LesstofAankomendPipe } from './lesstof-aankomend.pipe';
import { LesstofDatumformatPipe } from './lesstof-datumformat.pipe';
import { LesstofModel } from './lesstof.model';

export const DEFAULT_AANTAL_LESSTOF_ITEMS = 5;

@Component({
    selector: 'sl-lesstof',
    imports: [CommonModule, StudiewijzerItemComponent, IconPillComponent, LesstofAankomendPipe, LesstofDatumformatPipe],
    templateUrl: './lesstof.component.html',
    styleUrl: './lesstof.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronOnder)]
})
export class LesstofComponent implements AfterViewInit {
    @ViewChildren(StudiewijzerItemComponent) studiewijzerItems: QueryList<StudiewijzerItemComponent>;
    private _accessibilityService = inject(AccessibilityService);
    private _sidebarService = inject(SidebarService);
    private _injector = inject(Injector);

    public vak = input<SVak>();
    public lesstof = input.required<LesstofModel | undefined>();
    public aantalLesstofItems = input.required<number>();

    lesstofItems = output<number>();

    private focusLestofIndex = -1;

    ngAfterViewInit(): void {
        // Bij het laden van meer lesstof-items zetten we de focus op het volgende lesstofitem.
        effect(
            () => {
                this.lesstof();

                if (!this._accessibilityService.isAccessedByKeyboard()) return;
                setTimeout(() => {
                    const item = this.studiewijzerItems.toArray()[this.focusLestofIndex];

                    if (item) {
                        item.elementRef.nativeElement.focus();
                    }
                });
            },
            { injector: this._injector }
        );
    }

    public openLesstof(lesstofItem: SStudiewijzerItem) {
        this._sidebarService.push(
            StudiewijzerItemInstructieComponent,
            { item: lesstofItem, toonInleverenKnop: false },
            createSidebarSettings({
                title: this.vak()?.naam,
                headerType: 'normal',
                vakIcon: getIconVoorVak(this.vak()?.naam ?? '')
            })
        );
    }

    public toonMeer() {
        this.focusLestofIndex = this.aantalLesstofItems();
        this.lesstofItems.emit(this.aantalLesstofItems() + DEFAULT_AANTAL_LESSTOF_ITEMS);
    }
}
