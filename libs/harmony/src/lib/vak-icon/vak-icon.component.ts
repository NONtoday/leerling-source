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

export const provideVakIcons: Provider[] = provideIcons(
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
);

export function getIconVoorVak(vaknaam: string): IconName {
    const DEFAULT_ICON = 'overig6';
    const lowercaseVaknaam = vaknaam.toLowerCase();
    const firstChar = lowercaseVaknaam.charAt(0);

    return findExactMatch(lowercaseVaknaam)?.icon ?? findPartialMatch(firstChar)?.icon ?? DEFAULT_ICON;
}

function findExactMatch(vaknaam: string): VakType | undefined {
    return vaknamen.find((vaktype) => vaktype.keywords.includes(vaknaam));
}

function findPartialMatch(firstChar: string): VakType | undefined {
    return overig.find((vaktype) => vaktype.keywords.includes(firstChar));
}

@Component({
    selector: 'hmy-vak-icon',
    standalone: true,
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
