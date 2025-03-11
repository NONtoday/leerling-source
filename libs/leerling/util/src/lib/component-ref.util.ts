import { ComponentRef, EmbeddedViewRef } from '@angular/core';

export const getHTMLElement = (component: ComponentRef<any>): HTMLElement => {
    return (component.hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
};
