import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SpinnerComponent, SwitchComponent, SwitchGroupComponent, TabComponent } from 'harmony';
import { TabBarComponent } from 'leerling-base';
import { REloRestricties } from 'leerling-codegen';
import { HeaderComponent, ScrollableTitleComponent } from 'leerling-header';
import { AccessibilityService, onRefreshOrRedirectHome } from 'leerling-util';
import { CijfersService } from '../../services/cijfers/cijfers.service';

@Component({
    selector: 'sl-cijfers',
    standalone: true,
    imports: [
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        TabComponent,
        SwitchGroupComponent,
        SwitchComponent,
        ScrollableTitleComponent,
        SpinnerComponent,
        HeaderComponent,
        TabBarComponent
    ],
    templateUrl: './cijfers.component.html',
    styleUrls: ['./cijfers.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CijfersComponent {
    public static CIJFERSFEATURE: keyof REloRestricties = 'cijfersBekijkenAan';

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

        onRefreshOrRedirectHome([CijfersComponent.CIJFERSFEATURE]);
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
}
