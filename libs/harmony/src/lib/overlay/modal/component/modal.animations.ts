import { animate, state, style, transition, trigger } from '@angular/animations';

export const modalMaskAnimation = trigger('maskAnimation', [
    transition(':enter', [style({ opacity: 0 }), animate('150ms ease-in', style({ opacity: 1 }))]),
    state('hide', style({ opacity: 0 })),
    transition('* => hide', [animate('150ms ease-out')])
]);

export const modalContentAnimation = trigger('contentAnimation', [
    state('show-modal', style({ opacity: 1, transform: 'scale(1)' })),
    state('hide-modal', style({ opacity: 0, transform: 'scale(0.8)' })),
    transition('void => show-modal', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('150ms ease-in', style({ opacity: 1, transform: 'scale(1)' }))
    ]),
    transition('* => hide-modal', [animate('150ms ease-out')]),

    state('show-rollup', style({ transform: 'translateY(0px)' })),
    transition('void => show-rollup', [style({ transform: 'translate(0,100%)' }), animate('350ms cubic-bezier(0.17, 0.89, 0.24, 1)')])
]);
