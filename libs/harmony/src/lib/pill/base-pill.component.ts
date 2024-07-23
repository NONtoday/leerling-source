import { Directive, HostBinding, Input, OnChanges, inject } from '@angular/core';
import { match } from 'ts-pattern';
import { TooltipDirective } from '../directives/tooltip/tooltip.directive';
import { PillTagColor, PillTagType } from '../pill-tag/pill-tag.model';
import { ColorToken } from '../tokens/color-token';

@Directive()
export abstract class BasePillComponent implements OnChanges {
    private tooltipDirective = inject(TooltipDirective, { optional: true });
    @Input() @HostBinding('attr.type') public type: PillTagType = 'light';
    @Input() @HostBinding('attr.color') public color: PillTagColor = 'primary';
    @Input() @HostBinding('class.met-chevron') public metChevron = false;
    @Input() @HostBinding('class.hoverable') public hoverable: boolean;
    @Input() @HostBinding('class.pointer') public pointer = false;
    @Input() public text = '';

    ngOnChanges(): void {
        // Pill heeft default een hoverstate als er een klikactie aan hangt (chevron) of als deze een tooltip heeft.
        this.hoverable = this.hoverable ?? (this.metChevron || (!!this.tooltipDirective && this.tooltipDirective.isDisplayable()));
    }

    getIconColor() {
        return match(this.type)
            .with('darker', () => {
                return match(this.color)
                    .returnType<ColorToken>()
                    .with('primary-strong', () => 'fg-on-primary-strongest')
                    .with('neutral', () => 'fg-on-neutral-strongest')
                    .with('disabled', () => 'disabled-fg')
                    .otherwise((mode) => `fg-on-${mode}-normal`);
            })
            .otherwise(() => {
                return match(this.color)
                    .returnType<ColorToken>()
                    .with('primary-strong', () => 'fg-on-primary-weak')
                    .with('disabled', () => 'disabled-fg')
                    .otherwise((color) => `fg-on-${color}-weak`);
            });
    }
}
