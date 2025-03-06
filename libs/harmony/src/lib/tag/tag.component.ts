import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, inject, output } from '@angular/core';
import { IconChevronOnder, IconName, IconSluiten, provideIcons } from 'harmony-icons';

import { Optional } from '../optional/optional';
import { PillTagColor, PillTagType } from '../pill-tag/pill-tag.model';
import { InternalTagComponent } from './internal-tag/internal-tag.component';

@Component({
    selector: 'hmy-tag',
    imports: [CommonModule, InternalTagComponent],
    template: `<hmy-internal-tag
        [class.active]="element.nativeElement.classList.contains('active')"
        [type]="type"
        [color]="color"
        [size]="size"
        [activeColor]="activeColor"
        [icon]="icon"
        [label]="label"
        [iconAriaLabel]="iconAriaLabel"
        [iconTabindex]="iconTabindex"
        [textEllipsis]="textEllipsis"
        (iconClick)="iconClick.emit()" />`,
    styles: [
        `
            :host {
                --max-width: initial;
                max-width: var(--max-width);
            }
        `
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconSluiten, IconChevronOnder)]
})
export class TagComponent {
    @Input({ required: true }) public label: string;
    @Input() public iconAriaLabel: string;
    @Input() public iconTabindex: number;
    @Input() public type: PillTagType = 'light';
    @Input() public activeColor: Optional<PillTagColor>;
    @Input() public color: PillTagColor = 'primary';
    @Input() public size: 'big' | 'small' = 'small';
    @Input() public icon: TagIcon = 'sluiten';
    @Input() @HostBinding('class.active') public active = false;
    @Input() textEllipsis = false;

    public iconClick = output<void>();

    public element = inject(ElementRef);
}

export type TagIcon = Extract<IconName, 'sluiten' | 'chevronOnder'> | 'none';
