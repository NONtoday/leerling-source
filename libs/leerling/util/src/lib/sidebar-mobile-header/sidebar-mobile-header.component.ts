import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, afterRender, computed, input, output, signal, viewChild } from '@angular/core';
import { IconDirective, VakIconComponent } from 'harmony';
import { IconName, IconSluiten, provideIcons } from 'harmony-icons';
import { IconInput, TitleIconInput } from '../sidebar-page/sidebar-page.component';

const TITLE_TOP_BAR_HEIGHT = 60;

@Component({
    selector: 'sl-mobile-sidebar-header',
    imports: [CommonModule, IconDirective, VakIconComponent],
    templateUrl: './sidebar-mobile-header.component.html',
    styleUrl: './sidebar-mobile-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconSluiten)],
    host: {
        '[style.height.px]': 'componentHeight()'
    }
})
export class SidebarMobileHeaderComponent {
    private _titleRef = viewChild.required('titleSpan', { read: ElementRef });

    public title = input.required<string>();
    public titleIcon = input<TitleIconInput | undefined>(undefined);
    public vakNaam = input<IconName | undefined>(undefined);
    public parentScrollY = input.required<number>();
    public iconsRight = input<IconInput[]>([]);
    public showBackButton = input<boolean>(true);
    private positiveParentScrollY = computed(() => Math.max(0, this.parentScrollY()));

    terugClicked = output<void>();

    public componentHeight = computed(() => this.titleHeight() + TITLE_TOP_BAR_HEIGHT);
    public containerHeight = computed(() => {
        return Math.max(TITLE_TOP_BAR_HEIGHT, this.componentHeight() - this.positiveParentScrollY());
    });

    public titleHeight = signal(0);
    public titleHidden = computed(() => this.percentageHidden() === 100);
    public titleStyle = computed(() => ({
        opacity: 1 - this.percentageHidden() / 100,
        transform: `translateY(${-this.positiveParentScrollY()}px)`
    }));

    private percentageHidden = computed(() => (Math.min(this.positiveParentScrollY(), this.titleHeight()) / this.titleHeight()) * 100);

    constructor() {
        afterRender({
            read: () => {
                const titleHeight = Math.ceil(parseFloat(getComputedStyle(this._titleRef().nativeElement).height));
                this.titleHeight.set(titleHeight);
            }
        });
    }
}
