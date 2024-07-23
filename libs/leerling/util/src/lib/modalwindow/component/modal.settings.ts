export const FULL_SCREEN_MET_MARGIN = 'calc(95% - var(--safe-area-inset-top))';

export interface ModalSettings {
    showClose: boolean;
    contentPadding: number;
    heightRollup: string;
    maxHeightRollup: string;
    heightModal: string;
    maxHeightModal: string;
    keepOnNavigation?: boolean;
    onClose?: () => void;
}

export function createModalSettings(updatedSettings?: Partial<ModalSettings>): ModalSettings {
    return {
        showClose: true,
        contentPadding: 16,
        heightRollup: 'initial',
        maxHeightRollup: '75%',
        heightModal: 'initial',
        maxHeightModal: '75%',
        keepOnNavigation: false,
        ...updatedSettings
    };
}
