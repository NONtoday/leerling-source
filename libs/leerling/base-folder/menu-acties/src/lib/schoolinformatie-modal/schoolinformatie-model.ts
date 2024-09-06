import { ColorToken } from 'harmony';
import { IconName } from 'harmony-icons';

export type SchoolinformatieModalTabTitel = 'Schoolgegevens' | 'Vakanties';

export interface SchoolinformatieModalTab {
    titel: SchoolinformatieModalTabTitel;
    icon: IconName;
    fgColor: ColorToken;
    bgColor: ColorToken;
    offlineAvailable?: boolean;
}

export const tabs: SchoolinformatieModalTab[] = [
    {
        titel: 'Schoolgegevens',
        icon: 'school',
        fgColor: 'fg-on-warning-weak',
        bgColor: 'bg-warning-weak'
    },
    {
        titel: 'Vakanties',
        icon: 'vakantie',
        fgColor: 'fg-on-positive-weak',
        bgColor: 'bg-positive-weak'
    }
];
