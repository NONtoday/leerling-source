import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, HostBinding, input, output, signal } from '@angular/core';
import { IconDirective, SpinnerComponent } from 'harmony';
import { IconVerwijderen, provideIcons } from 'harmony-icons';

@Component({
    selector: 'shared-bijlage',
    imports: [CommonModule, IconDirective, SpinnerComponent],
    templateUrl: './bijlage.component.html',
    styleUrl: './bijlage.component.scss',
    providers: [provideIcons(IconVerwijderen)],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.with-border-bottom]': 'toonBorderBottom()',
        '[class.hoverable]': 'heeftUrl()',
        '[attr.aria-label]': 'ariaLabel()'
    }
})
export class BijlageComponent {
    @HostBinding('attr.tabindex') private _tabIndex = 0;
    @HostBinding('attr.role') private _role = 'link';

    public verwijderAriaLabel = input('Bijlage verwijderen');
    public omschrijving = input.required<string>();
    public extensie = input.required<string>();
    public url = input.required<string | undefined>();
    public ondertitel = input<string>();
    public toonVerwijderKnop = input(false);
    public toonBorderBottom = input(false);

    public isVerwijderen = signal(false);

    public onVerwijder = output();

    private heeftUrl = computed(() => Boolean(this.url()));
    private ariaLabel = computed(() => [this.extensie(), this.omschrijving(), this.ondertitel()].filter(Boolean).join(', '));

    public verwijder(event: Event) {
        event.stopPropagation();
        this.isVerwijderen.set(true);
        this.onVerwijder.emit();
    }
}
