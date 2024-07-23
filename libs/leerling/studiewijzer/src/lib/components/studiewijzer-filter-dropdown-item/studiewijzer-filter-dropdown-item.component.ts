import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, inject, input, output, signal } from '@angular/core';
import { CheckboxComponent, ColorToken, IconDirective, VakIconComponent } from 'harmony';
import { IconHuiswerk, IconInleveropdracht, IconName, IconToets, IconToetsGroot, provideIcons } from 'harmony-icons';

type FilterType = 'vak' | 'type';

@Component({
    selector: 'sl-studiewijzer-filter-dropdown-item',
    standalone: true,
    imports: [CommonModule, CheckboxComponent, IconDirective, VakIconComponent],
    templateUrl: './studiewijzer-filter-dropdown-item.component.html',
    styleUrl: './studiewijzer-filter-dropdown-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconHuiswerk, IconInleveropdracht, IconToets, IconToetsGroot)]
})
export class StudiewijzerFilterDropdownItemComponent {
    public elementRef = inject(ElementRef);

    label = input.required<string>();
    type = input.required<FilterType>();
    filterValue = input.required<string>();
    icon = input<IconName>();
    iconColor = input<ColorToken>();

    public addOrSubstractToCounter = output<number>();

    public afgevinkt = signal(false);

    @HostBinding('class.checked') get checked() {
        return this.afgevinkt();
    }

    @HostBinding('attr.aria-selected') get selected() {
        return this.afgevinkt();
    }

    public onAfvinken() {
        this.afgevinkt.set(!this.afgevinkt());
        if (this.afgevinkt()) {
            this.addOrSubstractToCounter.emit(1);
        } else {
            this.addOrSubstractToCounter.emit(-1);
        }
    }
}
