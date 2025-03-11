import { ColorToken } from 'harmony';
import { IconName } from 'harmony-icons';

export interface HuiswerkFilterType {
    label: string;
    filter: string;
    icon: IconName;
    color: ColorToken;
}

export const HUISWERKFILTER: HuiswerkFilterType = {
    label: 'Huiswerk',
    filter: 'HUISWERK',
    icon: 'huiswerk',
    color: 'fg-primary-normal'
};
export const TOETSFILTER: HuiswerkFilterType = {
    label: 'Toetsen',
    filter: 'TOETS',
    icon: 'toets',
    color: 'fg-warning-normal'
};
export const GROTETOETSFILTER: HuiswerkFilterType = {
    label: 'Grote Toets',
    filter: 'GROTE_TOETS',
    icon: 'toetsGroot',
    color: 'fg-negative-normal'
};
export const INLEVEROPDRACHTFILTER: HuiswerkFilterType = {
    label: 'Inleveropdrachten',
    filter: 'INLEVEROPDRACHT',
    icon: 'inleveropdracht',
    color: 'fg-alternative-normal'
};
