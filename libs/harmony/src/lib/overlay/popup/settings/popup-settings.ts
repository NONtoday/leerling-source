export const DEFAULT_ELEMENT_OFFSET = 8;
export const DEFAULT_SCROLL_OFFSET = 8;

export interface PopupSettings {
    animation: 'none' | 'fade' | 'slide';
    position: 'above' | 'under' | 'left' | 'right';
    alignment: 'start' | 'center' | 'end';
    elementOffset: number;
    offsets: { top: number; bottom: number };
    scrollOffset: number;
    keepOnNavigation?: boolean;
    width: string;
    maxWidth: string;
    maxHeight: string;
    left?: number;
    popupOpenClass: string;
    onClose?: () => void;
}

export const createPopupSettings = (updatedSettings?: Partial<PopupSettings>, includeStickyOffsets = true): PopupSettings => {
    let headerOffset = 0;
    let tabBarOffset = 0;

    //TODO: leerling specifiek - maar elementen worden voor docent toch niet gevonden
    if (includeStickyOffsets) {
        headerOffset = document.querySelector('sl-header')?.getBoundingClientRect().height ?? 0;
        tabBarOffset = document.querySelector('sl-tab-bar')?.getBoundingClientRect().height ?? 0;
    }

    return {
        animation: 'fade',
        position: 'under',
        alignment: 'center',
        elementOffset: DEFAULT_ELEMENT_OFFSET,
        scrollOffset: DEFAULT_SCROLL_OFFSET,
        offsets: {
            top: headerOffset,
            bottom: tabBarOffset
        },
        keepOnNavigation: false,
        width: 'initial',
        maxWidth: 'none',
        maxHeight: 'none',
        left: undefined,
        popupOpenClass: 'popup-open',
        ...updatedSettings
    };
};
