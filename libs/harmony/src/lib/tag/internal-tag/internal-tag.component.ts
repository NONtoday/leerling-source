import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input, OnChanges, output } from '@angular/core';
import { IconChevronOnder, IconSluiten, provideIcons } from 'harmony-icons';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { IconDirective } from '../../icon/icon.directive';
import { Optional } from '../../optional/optional';
import { PillTagColor, PillTagType } from '../../pill-tag/pill-tag.model';
import { TagIcon } from '../tag.component';

/**
 * Dit is het basis component voor alle tags.
 */
@Component({
    selector: 'hmy-internal-tag',
    standalone: true,
    imports: [CommonModule, TooltipDirective, IconDirective],
    templateUrl: './internal-tag.component.html',
    styleUrls: ['../../pill-tag/pill-tag-mode.scss', './internal-tag.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconSluiten, IconChevronOnder)]
})
export class InternalTagComponent implements OnChanges {
    @Input() @HostBinding('attr.type') public type: PillTagType = 'light';
    @Input() @HostBinding('attr.active-color') public activeColor: Optional<PillTagColor>;
    @Input() @HostBinding('attr.color') public color: PillTagColor = 'primary';
    @Input() @HostBinding('attr.size') public size: 'big' | 'small' = 'small';
    @Input({ required: true }) public label: string;
    @Input() public iconAriaLabel: string;
    @Input() public iconTabindex: number;
    @Input() public icon: TagIcon = 'sluiten';
    @Input() textEllipsis = false;
    @HostBinding('class.with-action-icon') withActionIcon = false;

    public iconClick = output<void>();

    ngOnChanges(): void {
        this.withActionIcon = this.icon !== 'none';
    }
}
