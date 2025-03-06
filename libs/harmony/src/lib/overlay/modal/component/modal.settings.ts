import { IconName } from 'harmony-icons';
import { ColorToken } from '../../../tokens/color-token';

export interface ModalSettings {
    showClose: boolean;
    showBackButton: boolean;
    contentPadding: number;
    heightRollup: string;
    maxHeightRollup: string;
    heightModal: string;
    widthModal: string;
    maxHeightModal: string;
    keepOnNavigation: boolean;
    title: string | undefined;
    titleIcon: ModalIconName | undefined;
    titleIconColor: ColorToken | undefined;
    closePosition: {
        top: number | undefined;
        right: number | undefined;
    };
    onClose?: () => void;
    onBackButton?: () => void;
    hasBookmarkableUrl: boolean;
    cdkTrapFocusAutoCapture: boolean;
}

export type MaskAnimationState = 'show' | 'hide';
export type ContentAnimationState = 'show-modal' | 'show-rollup' | 'hide-modal' | 'hide-rollup';

export function createModalSettings(updatedSettings?: Partial<ModalSettings>): ModalSettings {
    return {
        showClose: true,
        showBackButton: false,
        contentPadding: 16,
        heightRollup: 'initial',
        maxHeightRollup: '75%',
        heightModal: 'initial',
        maxHeightModal: '75%',
        widthModal: 'max-content',
        keepOnNavigation: false,
        title: undefined,
        titleIcon: undefined,
        titleIconColor: undefined,
        closePosition: {
            top: undefined,
            right: undefined
        },
        hasBookmarkableUrl: false,
        cdkTrapFocusAutoCapture: true,
        ...updatedSettings
    };
}

type Satisfies<T, U extends T> = U;

// Let op: als je deze opties wilt uitbreiden zul je ook de provideIcons in ModalComponent moeten uitbreiden
export type ModalIconName = Satisfies<IconName, 'waarschuwing'>;
