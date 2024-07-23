import { animate, state, style, transition, trigger } from '@angular/animations';

export type BackgroundAnimationState = 'cover' | 'shrink-slide-up';

export const BACKGROUND_ANIMATION = trigger('backgroundAnimation', [
    state('cover', style({ transform: 'scale(3.2)' })),
    state('shrink-slide-up', style({ transform: 'translate(-50%,-50%)' })),
    transition('* => shrink-slide-up', [
        style({ transform: 'scale(3.2)' }),
        animate('500ms cubic-bezier(1,0,.39,1.20)', style({ transform: 'translate(-50%,-50%)' }))
    ])
]);

export type TitleAnimationState = 'default' | 'slide-up';

export const TITLE_ANIMATION = trigger('titleAnimation', [
    state(
        'default',
        style({
            transform: 'translateY(var(--title-animation))'
        })
    ),
    state('slide-up', style({ transform: 'translateY(0)' })),
    transition('* => slide-up', [
        style({
            transform: 'translateY(var(--title-animation))'
        }),
        animate('500ms cubic-bezier(1,0,.39,1.20)', style({ transform: 'translateY(0)' }))
    ])
]);

export type ImageAnimationState = 'default' | 'fade-slide-up';

export const IMAGE_ANIMATION = trigger('imageAnimation', [
    state('default', style({ opacity: 0, transform: 'translateY(130px)' })),
    state('fade-slide-up', style({ opacity: 1, transform: 'translateY(0)' })),
    transition('default => fade-slide-up', [
        style({ opacity: 0, transform: 'translateY(130px)' }),
        animate('500ms cubic-bezier(1,0,.39,1.20)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])
]);

export type BottomAnimationState = 'default' | 'fade-slide-up';

export const BOTTOM_ANIMATION = trigger('bottomAnimation', [
    state('default', style({ opacity: 0, transform: 'translateY(130px)' })),
    state('fade-slide-up', style({ opacity: 1, transform: 'translateY(0)' })),
    transition('default => fade-slide-up', [
        style({ opacity: 0, transform: 'translateY(130px)' }),
        animate('500ms cubic-bezier(1,0,.39,1.20)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])
]);
