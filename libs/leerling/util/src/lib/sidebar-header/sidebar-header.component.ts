import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconDirective, VakIconComponent } from 'harmony';
import { IconPijlLinks, IconSluiten, provideIcons } from 'harmony-icons';
import { IconInput } from '../sidebar-page/sidebar-page.component';

@Component({
    selector: 'sl-sidebar-header',
    standalone: true,
    imports: [CommonModule, IconDirective, VakIconComponent],
    templateUrl: './sidebar-header.component.html',
    styleUrl: './sidebar-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconSluiten, IconPijlLinks)]
})
export class SidebarHeaderComponent {
    title = input.required<string>();
    showBackButton = input.required<boolean>();
    iconLeft = input.required<IconInput | undefined>();
    iconsRight = input.required<IconInput[]>();
    vakNaam = input<string | undefined>(undefined);

    terugClicked = output<void>();
    sluitenClicked = output<void>();
    iconClicked = output<void>();
}
