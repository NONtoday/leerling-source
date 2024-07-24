import { disableBodyScroll } from 'body-scroll-lock';

export function disableBodyScrollWithTouchMove(element: HTMLElement | Element) {
    disableBodyScroll(element, {
        allowTouchMove: (e) => {
            let currentElement: HTMLElement | Element | null = e;
            while (currentElement && currentElement !== document.body) {
                if (currentElement === element) {
                    return true;
                }
                currentElement = currentElement.parentElement;
            }
            return false;
        }
    });
}
