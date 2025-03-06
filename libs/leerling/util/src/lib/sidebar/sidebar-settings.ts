import { IconName } from 'harmony-icons';
import { IconInput, TitleIconInput } from '../sidebar-page/sidebar-page.component';
import { SidebarCloseTrigger } from './sidebar-model';

export type HeaderDevice = 'all' | 'none' | 'tabletDesktop' | 'mobilePortrait';
export type HeaderType = 'normal' | 'borderless';
export interface SidebarSettings {
    title: string;
    headerDevice: HeaderDevice;
    headerType: HeaderType;
    iconLeft?: IconInput;
    iconsRight?: IconInput[];
    titleIcon?: TitleIconInput;
    vakIcon?: IconName | string;
    avatar?: string;
    onClose?: (closeTrigger: SidebarCloseTrigger) => void;
    hideMobileBackButton?: true;
    hasBookmarkableUrl: boolean;
}

export function createSidebarSettings(updatedSettings?: Partial<SidebarSettings>): SidebarSettings {
    return {
        title: '-',
        headerDevice: 'all',
        headerType: 'normal',
        iconLeft: undefined,
        iconsRight: [],
        titleIcon: undefined,
        vakIcon: undefined,
        avatar: undefined,
        onClose: undefined,
        hasBookmarkableUrl: false,
        ...updatedSettings
    };
}
