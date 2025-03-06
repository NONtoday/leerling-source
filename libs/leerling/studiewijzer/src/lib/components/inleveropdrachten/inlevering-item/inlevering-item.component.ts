import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconDirective, PillComponent } from 'harmony';
import { IconKalenderDag, IconSlot, provideIcons } from 'harmony-icons';
import { isDeadlineVerstreken, StripAndElipsePipe } from 'leerling-studiewijzer-api';
import { formatDateNL } from 'leerling-util';
import { SStudiewijzerItem } from 'leerling/store';

export type IndicatieType = 'Te laat' | 'Heropend' | undefined;

@Component({
    selector: 'sl-inlevering-item',
    imports: [CommonModule, IconDirective, StripAndElipsePipe, PillComponent],
    templateUrl: './inlevering-item.component.html',
    styleUrl: './inlevering-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconSlot, IconKalenderDag)]
})
export class InleveringItemComponent {
    public inleverOpdracht = input.required<SStudiewijzerItem>();

    public deadline = computed(() =>
        formatDateNL(this.inleverOpdracht().inlevermoment?.eind ?? new Date(), 'dag_kort_dagnummer_maand_kort_tijd_zonder_komma')
    );

    public isDeadlineVerstreken = computed(() => {
        return isDeadlineVerstreken(this.inleverOpdracht());
    });

    public isInBeoordelingOfGeaccepteerd = computed(
        () =>
            this.inleverOpdracht().laatsteInleveringStatus === 'IN_BEHANDELING' ||
            this.inleverOpdracht().laatsteInleveringStatus === 'AKKOORD'
    );

    public indicatieType = computed(() => {
        const isHeropend = this.inleverOpdracht().laatsteInleveringStatus === 'HEROPEND';
        if (isHeropend) return 'Heropend';

        return this.isDeadlineVerstreken() ? 'Te laat' : undefined;
    });
}
