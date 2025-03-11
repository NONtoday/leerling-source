import { disableBodyScroll } from 'body-scroll-lock';

export function disableBodyScrollWithTouchMove(element: HTMLElement | Element) {
    disableBodyScroll(element, {
        allowTouchMove: (el: any) => {
            while (el && el !== document.body && el instanceof HTMLElement) {
                if (el.getAttribute('body-scroll-lock-ignore') !== null) {
                    return true;
                }

                el = el.parentElement;
            }
            return false;
        }
    });
}
