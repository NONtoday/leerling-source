import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { collapseOnLeaveAnimation, expandOnEnterAnimation } from 'angular-animations';
import { IconDirective, IconPillComponent, PillComponent } from 'harmony';
import { IconCheck, IconChevronLinks, IconChevronOnder, IconInbox, IconTijd, provideIcons } from 'harmony-icons';
import {
    InleveropdrachtCategorieEmptyStatePipe,
    InleveropdrachtCategorieIconColorPipe,
    InleveropdrachtCategorieIconNamePipe,
    InleveropdrachtCategorieToStringPipe
} from 'leerling-studiewijzer-api';
import { InleveropdrachtCategorie, SStudiewijzerItem } from 'leerling/store';
import { InleveringItemComponent } from '../inlevering-item/inlevering-item.component';

const ANIMATIONS = [expandOnEnterAnimation(), collapseOnLeaveAnimation()];

@Component({
    selector: 'sl-inlevering-map',
    imports: [
        CommonModule,
        IconDirective,
        InleveringItemComponent,
        IconPillComponent,
        PillComponent,
        InleveropdrachtCategorieIconColorPipe,
        InleveropdrachtCategorieIconNamePipe,
        InleveropdrachtCategorieToStringPipe,
        InleveropdrachtCategorieEmptyStatePipe
    ],
    templateUrl: './inlevering-map.component.html',
    styleUrl: './inlevering-map.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: ANIMATIONS,
    providers: [provideIcons(IconChevronOnder, IconChevronLinks, IconTijd, IconCheck, IconInbox)]
})
export class InleveringMapComponent implements AfterViewInit {
    public elementRef = inject(ElementRef);
    public inleverOpdrachten = input.required<SStudiewijzerItem[]>();
    public mapStatus = input.required<InleveropdrachtCategorie>();
    public isMapOpen = input<boolean>(false);

    inleverOpdrachtClick = output<SStudiewijzerItem>();

    public isOpen = signal(false);
    public inleveropdrachtenVoorStatus = computed(() =>
        this.inleverOpdrachten().filter((opdracht) => opdracht.inleveropdrachtCategorie === this.mapStatus())
    );

    ngAfterViewInit(): void {
        if (this.isMapOpen() && this.inleveropdrachtenVoorStatus().length > 0) {
            this.isOpen.set(true);
        }
    }

    public toggleOpen() {
        this.isOpen.set(!this.isOpen());
    }
}
