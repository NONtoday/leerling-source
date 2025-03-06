import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    Renderer2,
    ViewChild,
    WritableSignal,
    inject,
    signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AvatarComponent, DeviceService } from 'harmony';
import { IconSchool, IconSluiten, IconVakantie, provideIcons } from 'harmony-icons';
import { AccountModalDetailsComponent, AccountModalHeaderComponent, HeaderAction } from 'leerling-account-modal';
import { Affiliation, AuthenticationService, SomtodayLeerling } from 'leerling-authentication';
import { AccessibilityService, ISwipable, ModalScrollableElementsProvider, ModalService, SwipeInfo, SwipeManager } from 'leerling-util';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';
import { SchoolgegevensComponent } from '../schoolgegevens/schoolgegevens.component';
import { SchoolinformatieModalTabComponent } from '../schoolinformatie-modal-tab/schoolinformatie-modal-tab.component';
import { VakantiesComponent } from '../vakanties/vakanties.component';
import { SchoolinformatieModalTab, SchoolinformatieModalTabTitel, tabs } from './schoolinformatie-model';

@Component({
    selector: 'sl-schoolinformatie-modal',
    imports: [
        CommonModule,
        AccountModalHeaderComponent,
        SchoolinformatieModalTabComponent,
        AccountModalDetailsComponent,
        VakantiesComponent,
        SchoolgegevensComponent,
        AvatarComponent,
        A11yModule
    ],
    templateUrl: './schoolinformatie-modal.component.html',
    styleUrls: ['./schoolinformatie-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconSluiten, IconSchool, IconVakantie)]
})
export class SchoolinformatieModalComponent implements OnInit, OnDestroy, ISwipable, ModalScrollableElementsProvider {
    @ViewChild(AccountModalDetailsComponent, { static: true }) accountModalDetailsComponent: AccountModalDetailsComponent;
    @ViewChild('menu', { read: ElementRef }) accountMenuRef: ElementRef;
    @ViewChild('container', { read: ElementRef, static: false }) containerRef: ElementRef;

    private _modalService = inject(ModalService);
    private _deviceService = inject(DeviceService);
    private _authenticationService = inject(AuthenticationService);
    private _swipeManager = new SwipeManager(this);
    private _renderer = inject(Renderer2);
    private _accessibilityService: AccessibilityService = inject(AccessibilityService);

    public selectedTab: WritableSignal<SchoolinformatieModalTabTitel | undefined> = signal(undefined);

    private destroy$ = new Subject<void>();

    private _scrollElement = new BehaviorSubject<ElementRef[]>([]);

    public tabs: SchoolinformatieModalTab[] = tabs;
    public isOuder: boolean;

    public accountLeerling = toSignal(this._authenticationService.currentAccountLeerling$);

    ngOnInit() {
        this._authenticationService.currentAffiliation$.subscribe(
            (affiliation) => (this.isOuder = affiliation === Affiliation.PARENT_GUARDIAN)
        );

        if (this._deviceService.isTabletOrDesktop()) {
            this.selectTab(
                tabs.find((tab) => tab.titel === 'Schoolgegevens'),
                false
            );
        }

        setTimeout(() => {
            this._scrollElement.next([this.accountMenuRef, this.accountModalDetailsComponent.contentRef]);
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    initialen(leerling: SomtodayLeerling | undefined) {
        return leerling?.nn?.substring(0, 1)?.toUpperCase() ?? '--';
    }

    selectTab(item: SchoolinformatieModalTab | undefined, focusOnDetails = true) {
        this.selectedTab.set(item?.titel);
        this.accountModalDetailsComponent.contentRef.nativeElement.scrollTop = 0;
        if (focusOnDetails) {
            setTimeout(() => {
                if (this._accessibilityService.isAccessedByKeyboard()) {
                    this.accountModalDetailsComponent.accountModalHeader?.titleRef?.nativeElement.focus();
                }
            }, 250); // wacht animatie af, anders door de focus wordt de animatie afgekapt
        }
    }

    onHeaderActionClicked(action: HeaderAction) {
        switch (action) {
            case 'sluiten':
                this._modalService.animateAndClose();
                break;
            case 'terug':
                this.showMenu();
                break;
        }
    }

    onTouchStart(evt: TouchEvent) {
        if (this._deviceService.isTabletOrDesktop()) return;
        this._swipeManager.onTouchStart(evt);
        this._renderer.setStyle(this.accountMenuRef.nativeElement, 'transform', `translateX(0%)`);
    }

    onTouchMove(evt: TouchEvent) {
        if (this._deviceService.isTabletOrDesktop()) return;
        this._swipeManager.onTouchMove(evt);
    }

    onTouchEnd(evt: TouchEvent) {
        if (this._deviceService.isTabletOrDesktop()) return;
        this._swipeManager.onTouchEnd(evt);
    }

    onSuccessfullSwipe(): void {
        this.showMenu();
    }

    onSwiping(): void {
        return;
    }

    onSwipeStart(): void {
        // Er zijn al bestaande animaties voor als iemand klikt. Die zetten we uit.
        this._renderer.setStyle(this.accountModalDetailsComponent.elementRef.nativeElement, 'transition', `none`);
        this._renderer.setStyle(this.accountMenuRef.nativeElement, 'transition', `none`);
    }

    getSwipeInfo(): SwipeInfo {
        return {
            swipableElement: this.accountModalDetailsComponent.elementRef,
            swipeDirection: ['right'],
            pixelsMovedToSuccessfullSwipe: 36
        };
    }

    onCancelSwipe(): void {
        this._renderer.setStyle(this.accountMenuRef.nativeElement, 'transform', `translateX(-10%)`);

        setTimeout(() => {
            this.addTransition();
        }, 100);
    }

    private addTransition() {
        this._renderer.removeStyle(this.accountModalDetailsComponent.elementRef.nativeElement, 'transition');
        this._renderer.removeStyle(this.accountMenuRef.nativeElement, 'transition');
    }

    private showMenu() {
        this.addTransition();

        this._renderer.setStyle(this.accountModalDetailsComponent.elementRef.nativeElement, 'transform', `translateX(100%)`);
        this._renderer.setStyle(this.accountMenuRef.nativeElement, 'transform', `translateX(0)`);

        setTimeout(() => {
            this._renderer.removeStyle(this.accountModalDetailsComponent.elementRef.nativeElement, 'transform');
            this._renderer.removeStyle(this.accountMenuRef.nativeElement, 'transform');
            this.selectTab(undefined);
        }, 250);
    }

    getScrollableElements(): Observable<ElementRef[]> {
        return this._scrollElement.pipe(takeUntil(this.destroy$));
    }

    isSwipeAllowed(): boolean {
        const scrollTop = this.selectedTab()
            ? this.accountModalDetailsComponent.contentRef.nativeElement.scrollTop
            : this.accountMenuRef.nativeElement.scrollTop;
        return scrollTop === 0;
    }
}
