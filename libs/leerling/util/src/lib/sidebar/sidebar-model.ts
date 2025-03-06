import { Observable } from 'rxjs';

/**
 * Function that is called when a request for closing the sidebar is issued. The implementation of the guard typically
 * opens a confirmation modal, and should return an observable for when the user confirms the sidebar can be closed.
 */
export type SidebarCloseGuard = () => Observable<boolean>;

/**
 * Different triggers for closing the sidebar.
 */
export const SidebarCloseTriggers = [
    // click the backdrop mask of the overlay
    'backdrop-click',
    // pressing the escape key
    'escape-key',
    // some external trigger, e.g. another service requesting the sidebar to be closed
    'external',
    // router navigation
    'navigation',
    // pressing the "back" button on the sidebar page
    'page-back',
    // pressing the "close" button on the sidebar page
    'page-close'
] as const;

export type SidebarCloseTrigger = (typeof SidebarCloseTriggers)[number];

/**
 * Utility functions that can be used by internal components to close the sidebar.
 */
export interface CloseSidebarUtil {
    /**
     * Immediately close the sidebar, after any guards have been confirmed and animations have completed.
     */
    finalizeClose(usingOnClose: boolean, trigger: SidebarCloseTrigger): void;

    /**
     * Request for the sidebar to be closed. If a guard is registered, it will be presented to the user.
     */
    requestClose(trigger: SidebarCloseTrigger): void;

    /**
     * Immediately go one page back in the sidebar, after any guards have been confirmed and animations have completed.
     */
    finalizeBack(usingOnClose: boolean): void;

    /**
     * Request to go one page back in the sidebar. If a guard is registered, it will be presented to the user.
     */
    requestBack(trigger: SidebarCloseTrigger): void;
}
