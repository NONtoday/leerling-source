import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject, OnDestroy, viewChild } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SwitchComponent, SwitchGroupComponent, TabComponent } from 'harmony';
import { CIJFERS, getRestriction, TabBarComponent } from 'leerling-base';
import { REloRestricties } from 'leerling-codegen';
import { HeaderComponent, ScrollableTitleComponent } from 'leerling-header';
import { AccessibilityService, onRefreshOrRedirectHome } from 'leerling-util';
import { CijfersService } from '../../services/cijfers/cijfers.service';

@Component({
    selector: 'sl-cijfers',
    imports: [
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        TabComponent,
        SwitchGroupComponent,
        SwitchComponent,
        ScrollableTitleComponent,
        HeaderComponent,
        TabBarComponent
    ],
    templateUrl: './cijfers.component.html',
    styleUrls: ['./cijfers.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CijfersComponent implements OnDestroy {
    public static CIJFERSFEATURE: keyof REloRestricties = 'cijfersBekijkenAan';

    public switchOverzicht = viewChild('switchOverzicht', { read: RouterLinkActive });

    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _cijfersService = inject(CijfersService);
    private accessibilityService = inject(AccessibilityService);

    public toonTabs = this._cijfersService.toonTabs;
    public scrollableTitle = this._cijfersService.scrollableTitle;

    constructor() {
        effect(() => {
            this.scrollableTitle();
            this.toonTabs();
            this._changeDetectorRef.detectChanges();
        });

        onRefreshOrRedirectHome([getRestriction(CIJFERS)]);
    }

    public routerLinkActiveOptions: IsActiveMatchOptions = {
        paths: 'exact',
        matrixParams: 'ignored',
        queryParams: 'ignored',
        fragment: 'ignored'
    };

    setTabIndex(index: number) {
        setTimeout(() => {
            if (this.accessibilityService.isAccessedByKeyboard()) {
                this.accessibilityService.focusElementWithTabIndex(index);
            }
        });
    }

    ngOnDestroy() {
        this._cijfersService.setToonLegeResultaatKolommen(false);
    }
}
