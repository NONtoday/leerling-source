import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
    IconKlok,
    IconLeerlingVerwijderd,
    IconName,
    IconOOhulpmiddelen,
    IconPersoonCheck,
    IconPersoonKruis,
    provideIcons
} from 'harmony-icons';
import { split } from 'string-ts';
import { match } from 'ts-pattern';
import { CssVarPipe, toCssVar } from '../css-var-pipe/css-var.pipe';
import { IconDirective } from '../icon/icon.directive';
import { BgColorToken, BorderColorToken, OnColorToken } from '../tokens/on-color-token';

export type RegistratieCategorie =
    | 'Afwezig ongeoorloofd'
    | 'Afwezig geoorloofd'
    | 'Te laat'
    | 'Verwijderd uit les'
    | 'Huiswerk niet in orde'
    | 'Materiaal niet in orde';

@Component({
    selector: 'hmy-registratie-categorie',
    standalone: true,
    imports: [CommonModule, IconDirective, CssVarPipe],
    templateUrl: './registratie-categorie.component.html',
    styleUrl: './registratie-categorie.component.scss',
    providers: [provideIcons(IconPersoonKruis, IconPersoonCheck, IconKlok, IconLeerlingVerwijderd, IconOOhulpmiddelen)],
    host: {
        '[style.--bg-color]': 'toCssVar(bgColor())',
        '[style.--color]': 'toCssVar(textColor())',
        '[style.--icon-bg-color]': 'toCssVar(iconBgColor())',
        '[style.--border-color]': 'toCssVar(borderColor())',
        '[class.hoverable]': 'hoverable()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistratieCategorieComponent {
    aantal = input.required<number>();
    categorie = input.required<RegistratieCategorie>();
    hoverable = input.required<boolean>();
    toCssVar = toCssVar;

    icon = computed(() =>
        match(this.categorie())
            .returnType<IconName>()
            .with('Afwezig ongeoorloofd', () => 'persoonKruis')
            .with('Afwezig geoorloofd', () => 'persoonCheck')
            .with('Te laat', () => 'klok')
            .with('Verwijderd uit les', () => 'leerlingVerwijderd')
            .with('Huiswerk niet in orde', () => 'huiswerk')
            .with('Materiaal niet in orde', () => 'oOhulpmiddelen')
            .exhaustive()
    );

    bgColor = computed(
        () =>
            match(this.categorie())
                .with('Afwezig ongeoorloofd', () => 'bg-primary-weak' as const)
                .with('Afwezig geoorloofd', () => 'bg-positive-weak' as const)
                .with('Te laat', () => 'bg-accent-weak' as const)
                .with('Verwijderd uit les', () => 'bg-warning-weak' as const)
                .with('Huiswerk niet in orde', () => 'bg-neutral-weakest' as const)
                .with('Materiaal niet in orde', () => 'bg-neutral-weak' as const)
                .exhaustive() satisfies BgColorToken
    );

    iconBgColor = computed(() => {
        const bgColor = split(this.bgColor(), '-weak')[0];
        return bgColor === 'bg-neutral' ? (`${bgColor}-strongest` as const) : (`${bgColor}-normal` as const);
    });

    borderColor = computed(() =>
        match(this.color())
            .returnType<BorderColorToken>()
            .with('primary', 'accent', 'positive', 'warning', (color) => `border-${color}-strong` as const)
            .with('neutral', () => 'border-neutral-strong' as const)
            .exhaustive()
    );

    textColor = computed(() => {
        const bg = split(this.bgColor(), 'bg-')[1];
        return `fg-on-${bg}` satisfies OnColorToken;
    });

    private color = computed(() => split(this.bgColor(), '-')[1]);
}
