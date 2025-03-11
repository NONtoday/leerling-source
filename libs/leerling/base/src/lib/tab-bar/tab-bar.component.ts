import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IsActiveMatchOptions, RouterModule } from '@angular/router';
import { ClassOnClickDirective, DeviceService } from 'harmony';
import { HeeftRechtDirective } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import { TabItemComponent } from '../tab-item/tab-item.component';
import { TabBarService } from './service/tab-bar.service';

@Component({
    selector: 'sl-tab-bar',
    standalone: true,
    imports: [CommonModule, TabItemComponent, RouterModule, ClassOnClickDirective, HeeftRechtDirective],
    templateUrl: './tab-bar.component.html',
    styleUrls: ['./tab-bar.component.scss'],
    host: {
        '[class.show]': 'show()',
        '[class.fixed-to-bottom]': 'fixedToBottom()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabBarComponent {
    private _deviceService = inject(DeviceService);
    public tabBarService = inject(TabBarService);
    public tabs = derivedAsync(() => this.tabBarService.items$);
    public isDesktop = derivedAsync(() => this._deviceService.isDesktop$);

    autoShowHide = input(true);
    fixedToBottom = input(false);

    isPhoneOrTablet = toSignal(this._deviceService.isPhoneOrTablet$, { requireSync: true });

    show = computed(() => (this.autoShowHide() ? this.isPhoneOrTablet() : true));

    public activeRootMatchOptions: IsActiveMatchOptions = {
        paths: 'exact',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored'
    };

    public activeMatchOptions: IsActiveMatchOptions = {
        paths: 'subset',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored'
    };
}
