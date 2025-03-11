import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, HostListener, computed, inject, input, output } from '@angular/core';
import { IconDirective, PillComponent, isPresent } from 'harmony';
import { IconBijlage, provideIcons } from 'harmony-icons';
import { SsoService } from 'leerling-authentication';

@Component({
    selector: 'sl-bijlage',
    standalone: true,
    imports: [PillComponent, UpperCasePipe, IconDirective],
    templateUrl: './bijlage.component.html',
    styleUrls: ['./bijlage.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconBijlage)]
})
export class BijlageComponent {
    private _ssoService = inject(SsoService);

    public omschrijving = input.required<string>();
    public uri = input.required<string>();
    public icon = input<boolean>(false);
    public extension = input<string | undefined>(undefined);
    public methode = input<string | undefined>(undefined);
    public uitgever = input<string | undefined>(undefined);
    public customTabIndex = input(0);
    public ariaRole = input('button');

    public aanvullendeTekst = computed(() => {
        return [this.methode(), this.uitgever()].filter(isPresent).join(' • ');
    });

    bijlageOpened = output<void>();

    @HostBinding('attr.tabindex')
    public get tabIndex(): number {
        return this.customTabIndex();
    }

    @HostBinding('attr.role')
    public get role(): string {
        return this.ariaRole();
    }

    @HostListener('click', ['$event'])
    public onClick(event: MouseEvent): void {
        event.stopPropagation();
        this.bijlageOpened.emit();
        this._ssoService.openExternalLink(this.uri());
    }
}
