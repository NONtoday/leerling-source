import { AnimationEvent, animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostBinding,
    HostListener,
    ViewChild,
    computed,
    inject,
    input
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ColorToken, DeviceService } from 'harmony';
import { IconName, IconPijlLinks, provideIcons } from 'harmony-icons';
import { fromEvent, map, startWith } from 'rxjs';
import { AccessibilityService } from '../accessibility/accessibility.service';
import { SidebarHeaderComponent } from '../sidebar-header/sidebar-header.component';
import { SidebarMobileHeaderComponent } from '../sidebar-mobile-header/sidebar-mobile-header.component';
import { SidebarService } from '../sidebar/service/sidebar.service';
import { CloseSidebarUtil } from '../sidebar/sidebar-model';
import { HeaderDevice, HeaderType } from '../sidebar/sidebar-settings';

const PAGE_ANIMATION = trigger('pageAnimation', [
    transition('void => slide-visible', [
        style({ transform: 'translateX(100%)' }),
        animate('350ms cubic-bezier(0.17, 0.89, 0.24, 1)', style({ transform: 'translateX(0%)' }))
    ]),
    state('slide-visible', style({ transform: 'translateX(0%)' })),
    state('slide-hidden', style({ transform: 'translateX(100%)' })),
    transition('slide-visible => slide-hidden', [animate('350ms cubic-bezier(0.17, 0.89, 0.24, 1)')])
]);

type AnimationState = 'slide-visible' | 'slide-hidden';
export type IconInput = { name: IconName; onClick: () => void };
export type TitleIconInput = { name: IconName; color: ColorToken };

const MOBILE_HEADER_TYPES: HeaderDevice[] = ['all', 'mobilePortrait'];
const DESKTOP_HEADER_TYPES: HeaderDevice[] = ['all', 'tabletDesktop'];

@Component({
    selector: 'sl-sidebar-page',
    imports: [CommonModule, SidebarHeaderComponent, SidebarMobileHeaderComponent],
    templateUrl: './sidebar-page.component.html',
    styleUrls: ['./sidebar-page.component.scss'],
    animations: [PAGE_ANIMATION],
    providers: [provideIcons(IconPijlLinks)],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarPageComponent implements AfterViewInit {
    @ViewChild(SidebarMobileHeaderComponent, { static: false }) mobileHeader: SidebarMobileHeaderComponent;
    public elementRef = inject(ElementRef);

    private _sidebarService = inject(SidebarService);
    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _deviceService = inject(DeviceService);
    private _accessibilityService = inject(AccessibilityService);

    public title = input.required<string>();
    public headerDevice = input.required<HeaderDevice>();
    public headerType = input.required<HeaderType>();
    public showBackButton = input(false);
    public hideMobileBackButton = input(false);
    public iconLeft = input<IconInput | undefined>(undefined);
    public iconsRight = input<IconInput[]>([]);
    public titleIcon = input<TitleIconInput | undefined>(undefined);
    public vakIcon = input<IconName | undefined>(undefined);
    public closeSidebarUtil = input.required<CloseSidebarUtil>();

    public isTabletOrDesktop = toSignal(this._deviceService.isTabletOrDesktop$);
    public showMobileBackButton = computed(() => this.showBackButton() || !this.hideMobileBackButton());

    public toonMobileHeader = computed(() => !this.isTabletOrDesktop() && MOBILE_HEADER_TYPES.includes(this.headerDevice()));
    public toonDesktopHeader = computed(() => this.isTabletOrDesktop() && DESKTOP_HEADER_TYPES.includes(this.headerDevice()));

    public scrollY = toSignal(
        fromEvent(this.elementRef.nativeElement, 'scroll').pipe(
            map(() => this.elementRef.nativeElement.scrollTop),
            startWith(this.elementRef.nativeElement.scrollTop)
        )
    );

    ngAfterViewInit(): void {
        if (this._accessibilityService.isAccessedByKeyboard()) {
            this._accessibilityService.goToContent(this.elementRef);
        }
    }

    @HostListener('scrollend', ['$event'])
    private onScrollEnd() {
        if (!this.mobileHeader) return;

        const scrollY = this.elementRef.nativeElement.scrollTop;
        const mobileTitleHeight = this.mobileHeader.titleHeight();
        const halfTitleHeight = mobileTitleHeight / 2;
        if (scrollY > 0 && scrollY < mobileTitleHeight) {
            this.elementRef.nativeElement.scrollTo({
                top: scrollY < halfTitleHeight ? 0 : mobileTitleHeight,
                behavior: 'smooth'
            });
        }
    }

    @HostBinding('@pageAnimation') private _animationState: AnimationState | undefined = undefined;
    public enableAnimation() {
        this._animationState = 'slide-visible';
    }

    public animateAndClose() {
        this._animationState = 'slide-hidden';
        this._changeDetectorRef.markForCheck();
    }

    @HostListener('@pageAnimation.done', ['$event'])
    private onAnimationDone(event: AnimationEvent) {
        if (event.fromState === 'void') {
            this._sidebarService.onPageAdded();
        } else if (event.fromState === 'slide-visible' && event.toState === 'slide-hidden') {
            this._sidebarService.back();
        }
    }

    terugClicked() {
        this.closeSidebarUtil().requestBack('page-back');
    }

    sluitenClicked() {
        this.closeSidebarUtil().requestClose('page-close');
    }
}
