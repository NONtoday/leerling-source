import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { TooltipDirective } from 'harmony';

@Component({
    selector: 'sl-vakgemiddelde-item-cijfer',
    imports: [CommonModule, TooltipDirective],
    templateUrl: './vakgemiddelde-item-cijfer.component.html',
    styleUrls: ['./vakgemiddelde-item-cijfer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VakgemiddeldeItemCijferComponent implements OnChanges {
    @Input({ required: true }) type: 'rapportcijfer' | 'schoolexamengemiddelde';
    @Input({ required: true }) formattedResultaat: string | undefined;
    @Input({ required: true }) bijzonderheid: 'TeltNietMee' | 'NietGemaakt' | 'Vrijstelling' | undefined;
    @Input({ required: true }) isVoldoende: boolean | undefined;
    @Input() aanduiding: string | undefined;
    @Input() toonAanduiding = true;

    public tooltip: string | undefined;

    ngOnChanges(): void {
        if (!this.formattedResultaat) {
            this.tooltip = undefined;
            return;
        }

        let tooltip;

        if (this.type === 'rapportcijfer') {
            tooltip = `Laatste ${this.type}`;
            if (this.aanduiding) {
                tooltip += ` • ${this.aanduiding}`;
            }
        } else {
            tooltip = 'Het SE (schoolexamen)-cijfer is het gemiddelde van alle cijfers uit het examendossier.';
        }

        if (this.bijzonderheid === 'TeltNietMee') {
            tooltip += ' • telt niet mee';
        }

        this.tooltip = tooltip;
    }
}
