import { CommonModule, I18nPluralPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, ViewContainerRef, computed, inject, input } from '@angular/core';
import { DeviceService, IconDirective } from 'harmony';
import { IconChevronOnder, IconFilter, provideIcons } from 'harmony-icons';
import { StudiewijzerItemComponent, sorteerStudiewijzerItems } from 'leerling-studiewijzer-api';
import {
    AccessibilityService,
    OverlayService,
    PopupOpenDirective,
    SidebarService,
    ToHuiswerkTypenPipe,
    WerkdrukIndicatorComponent
} from 'leerling-util';
import { SStudiewijzerItem } from 'leerling/store';
import { StudiewijzerItemDetailComponent } from 'leerling/studiewijzer';
import { pluralMapping } from './plural-mapping';
import { RoosterHuiswerkStackDetailComponent } from './rooster-huiswerk-stack-detail/rooster-huiswerk-stack-detail.component';

export type periode = 'dag' | 'week';

@Component({
    selector: 'sl-rooster-huiswerk-stack',
    standalone: true,
    imports: [
        CommonModule,
        WerkdrukIndicatorComponent,
        StudiewijzerItemComponent,
        ToHuiswerkTypenPipe,
        RoosterHuiswerkStackDetailComponent,
        I18nPluralPipe,
        PopupOpenDirective,
        IconDirective
    ],
    providers: [provideIcons(IconChevronOnder, IconFilter)],
    templateUrl: './rooster-huiswerk-stack.component.html',
    styleUrl: './rooster-huiswerk-stack.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterHuiswerkStackComponent {
    private _accessibilityService = inject(AccessibilityService);
    private _deviceService = inject(DeviceService);
    private _overlayService = inject(OverlayService);
    private _sidebarService = inject(SidebarService);

    public viewContainerRef = inject(ViewContainerRef);

    public weekItems = input<SStudiewijzerItem[]>([]);
    public dagItems = input<SStudiewijzerItem[]>([]);
    public datum = input<Date | undefined>(undefined);
    public baseTabIndex = input(0);

    public heeftWeekItems = computed(() => this.weekItems().length > 0);
    public aantalWeekItems = computed(() => this.weekItems().length);
    public heeftDagItems = computed(() => this.dagItems().length > 0);
    public aantalDagItems = computed(() => this.dagItems().length);

    public sortedWeekItems = computed(() => sorteerStudiewijzerItems(this.weekItems()));
    public sortedDagItems = computed(() => sorteerStudiewijzerItems(this.dagItems()));
    public weekEnDagItems = computed(() => [...this.sortedDagItems(), ...this.sortedWeekItems()]);
    public aantalWeekEnDagItems = computed(() => this.weekEnDagItems().length);

    public isMobileOrTabletPortrait = this._deviceService.isPhoneOrTabletPortrait();

    public pluralMapping = pluralMapping;

    @HostListener('click')
    public onClick() {
        const component = this._overlayService.popupOrModal(
            RoosterHuiswerkStackDetailComponent,
            {
                dagItems: this.sortedDagItems(),
                weekItems: this.sortedWeekItems(),
                datum: this.datum(),
                baseTabIndex: this.baseTabIndex()
            },
            RoosterHuiswerkStackDetailComponent.getPopupSettings(this.viewContainerRef.element.nativeElement.clientWidth),
            RoosterHuiswerkStackDetailComponent.getModalSettings(),
            this.viewContainerRef
        );

        component.itemSelected.subscribe((item) => {
            this._overlayService.animateAndClose(component);
            this._sidebarService.push(
                StudiewijzerItemDetailComponent,
                computed(() => ({
                    item: this.dagItems().find((swi) => swi.id === item.id) ?? this.weekItems().find((swi) => swi.id === item.id) ?? item
                })),
                StudiewijzerItemDetailComponent.getSidebarSettings(item, () => this._onHuiswerkDetailsClose())
            );
        });
    }

    private _onHuiswerkDetailsClose(): void {
        if (this._accessibilityService.isAccessedByKeyboard()) {
            this.viewContainerRef.element.nativeElement.focus();
        }
    }
}
