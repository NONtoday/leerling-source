import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Provider, computed, input } from '@angular/core';
import {
    IconAardrijkskunde,
    IconBedrijfseconomie,
    IconBiologie,
    IconChinees,
    IconDrama,
    IconDuits,
    IconEconomie,
    IconEngels,
    IconFilosofie,
    IconFrans,
    IconGeschiedenis,
    IconGodsdienst,
    IconGrieks,
    IconInformatica,
    IconLatijn,
    IconLichamelijkeopvoeding,
    IconMaatschappijleerburgerschap,
    IconManagementorganisatie,
    IconMuziek,
    IconName,
    IconNatuurkunde,
    IconNederlands,
    IconOverig1,
    IconOverig2,
    IconOverig3,
    IconOverig4,
    IconOverig5,
    IconOverig6,
    IconScheikunde,
    IconSchilderspalet,
    IconSpaans,
    IconTechniek,
    IconTekenen,
    IconVerzorging,
    IconWiskunderekenen,
    provideIcons
} from 'harmony-icons';
import { IconDirective, IconSize } from '../icon/icon.directive';
import { VakType, overig, vaknamen } from './vaknamen';

export const vakIcons = [
    IconAardrijkskunde,
    IconBedrijfseconomie,
    IconBiologie,
    IconChinees,
    IconDrama,
    IconDuits,
    IconEconomie,
    IconEngels,
    IconFilosofie,
    IconFrans,
    IconGeschiedenis,
    IconGodsdienst,
    IconGrieks,
    IconInformatica,
    IconLatijn,
    IconLichamelijkeopvoeding,
    IconMaatschappijleerburgerschap,
    IconManagementorganisatie,
    IconMuziek,
    IconNatuurkunde,
    IconNederlands,
    IconOverig1,
    IconOverig2,
    IconOverig3,
    IconOverig4,
    IconOverig5,
    IconOverig6,
    IconScheikunde,
    IconSchilderspalet,
    IconSpaans,
    IconTechniek,
    IconTekenen,
    IconVerzorging,
    IconWiskunderekenen
];

export const provideVakIcons: Provider[] = provideIcons(...vakIcons);

export function getIconVoorVak(vaknaam: string): IconName {
    const DEFAULT_ICON = 'overig6';
    const lowercaseVaknaam = vaknaam.toLowerCase();
    const firstChar = lowercaseVaknaam.charAt(0);

    const match =
        findVakNaamMatch(lowercaseVaknaam)?.icon ?? findAfkortingMatch(lowercaseVaknaam)?.icon ?? findPartialMatch(firstChar)?.icon;

    return match ?? DEFAULT_ICON;
}

function findVakNaamMatch(vaknaam: string): VakType | undefined {
    return vaknamen.find((vaktype) => vaktype.keywords.find((keyword) => vaknaam.includes(keyword)));
}

function findAfkortingMatch(afkorting: string): VakType | undefined {
    return vaknamen.find((vaktype) => vaktype.abreviation.includes(afkorting));
}

function findPartialMatch(firstChar: string): VakType | undefined {
    return overig.find((vaktype) => vaktype.keywords.includes(firstChar));
}

@Component({
    selector: 'hmy-vak-icon',
    imports: [CommonModule, IconDirective],
    templateUrl: './vak-icon.component.html',
    styleUrl: './vak-icon.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideVakIcons]
})
export class VakIconComponent {
    vaknaam = input.required<string>();
    size = input<IconSize>('medium');

    public icon = computed<IconName>(() => getIconVoorVak(this.vaknaam()));
}
