import { IconName } from 'harmony-icons';
import { IconInput } from '../sidebar-page/sidebar-page.component';

export type HeaderType = 'none' | 'normal' | 'borderless';

export interface SidebarSettings {
    title: string;
    headerType: HeaderType;
    iconLeft?: IconInput;
    iconsRight?: IconInput[];
    vakIcon?: IconName | string;
    avatar?: string;
    onClose?: () => void;
    hideMobileBackButton?: true;
}

export function createSidebarSettings(updatedSettings?: Partial<SidebarSettings>): SidebarSettings {
    return {
        title: '-',
        headerType: 'normal',
        iconLeft: undefined,
        iconsRight: [],
        vakIcon: undefined,
        avatar: undefined,
        onClose: undefined,
        ...updatedSettings
    };
}
