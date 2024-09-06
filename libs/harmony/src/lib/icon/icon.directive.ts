import { Directive, ElementRef, inject, Input, OnChanges, OnDestroy, OnInit, Renderer2, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { HARMONY_ICONS, IconName } from 'harmony-icons';
import { isMap } from 'lodash-es';
import { Subject, takeUntil } from 'rxjs';
import { Optional } from '../optional/optional';
import { DeviceService } from '../services/device.service';
import { ColorToken } from '../tokens/color-token';

export type IconSize = 'smallest' | 'small' | 'medium' | 'large';

export const SMALLEST_PX = 12;
export const SMALL_PX = 16;
export const MEDIUM_PX = 20;
export const LARGE_PX = 24;

@Directive({
    selector: '[hmyIcon]',
    standalone: true
})
export class IconDirective implements OnInit, OnChanges, OnDestroy {
    private element = inject(ElementRef);
    private deviceService = inject(DeviceService);
    private renderer = inject(Renderer2);
    private sanitizer = inject(DomSanitizer);

    private _phoneSize: number;
    private _tabletPortraitSize: number;
    private _tabletSize: number;
    private _desktopSize: number;

    /**
     * Values die voor alle devices geldt, wordt niet gebruikt als 'sizes' een value heeft
     */
    private _size = 16;

    private readonly icons = inject(HARMONY_ICONS);

    @Input() set sizeInPx(value: number) {
        this._size = value;
        this._phoneSize = this._size;
        this._tabletPortraitSize = this._size;
        this._tabletSize = this._size;
        this._desktopSize = this._size;
    }

    @Input() set sizesInPx(value: number[]) {
        this._size = value[0];
        this._phoneSize = value[0];
        this._tabletPortraitSize = value[1] ?? this._phoneSize;
        this._tabletSize = value[2] ?? this._tabletPortraitSize;
        this._desktopSize = value[3] ?? this._tabletSize;
    }

    // SMALLEST_PX = 12;
    // SMALL_PX = 16;
    // MEDIUM_PX = 20;
    // LARGE_PX = 24;
    @Input() set size(value: IconSize) {
        this._size = this.getSizeInPx(value);
        this._phoneSize = this._size;
        this._tabletPortraitSize = this._size;
        this._tabletSize = this._size;
        this._desktopSize = this._size;
    }

    @Input() color: Optional<ColorToken>;

    /**
     * Werking als volgt:
     *      - ['small] => alles small
     *      - ['small', 'medium'] => Phone small, de rest medium
     *      - ['small', 'medium', 'large'] => Phone small, tabletPortrait medium, de rest large
     *      - ['small', 'medium', 'large', 'application'] => Phone small, tabletPortrait medium, tablet large en desktop application
     */
    @Input() set sizes(value: IconSize[] | null) {
        if (value) {
            this._phoneSize = this.getSizeInPx(value[0]);
            this._tabletPortraitSize = value[1] ? this.getSizeInPx(value[1]) : this._phoneSize;
            this._tabletSize = value[2] ? this.getSizeInPx(value[2]) : this._tabletPortraitSize;
            this._desktopSize = value[3] ? this.getSizeInPx(value[3]) : this._tabletSize;
        } else {
            this._phoneSize = this._size;
            this._tabletPortraitSize = this._size;
            this._tabletSize = this._size;
            this._desktopSize = this._size;
        }
    }

    @Input()
    set hmyIcon(iconName: IconName) {
        // de !isMap check is omdat in unit tests met een overrideComponent een object uit de provider komt (geen idee waarom - lijkt een bug)
        if (!iconName || !isMap(this.icons)) return;
        const icon = this.icons.get(iconName);
        if (!icon) {
            console.error(`👀 we could not find the Icon with the name ${iconName}, did you add it to the Icon registry?`);
            return;
        }
        this.element.nativeElement.innerHTML = this.sanitizer.sanitize(SecurityContext.STYLE, icon) ?? '';
        this.element.nativeElement.setAttribute('icon', iconName);
    }

    private onDestroy$ = new Subject<void>();

    private getSizeInPx(value: IconSize) {
        switch (value) {
            case 'smallest':
                return SMALLEST_PX;
            case 'small':
                return SMALL_PX;
            case 'medium':
                return MEDIUM_PX;
            case 'large':
                return LARGE_PX;
            default:
                return SMALL_PX;
        }
    }

    ngOnInit() {
        this.renderer.addClass(this.element.nativeElement, 'svg');
        this.deviceService.onDeviceChange$.pipe(takeUntil(this.onDestroy$)).subscribe(() => this.applySize());
    }

    ngOnChanges() {
        this.applySize();
        this.applyFill();
    }

    ngOnDestroy(): void {
        this.onDestroy$.next();
        this.onDestroy$.complete();
    }

    private applySize() {
        const size = this.displaySize;
        this.element?.nativeElement.querySelector('svg')?.setAttribute('display', `block`);
        this.element?.nativeElement.querySelector('svg')?.setAttribute('height', `${size}px`);
        this.element?.nativeElement.querySelector('svg')?.setAttribute('width', `${size}px`);
    }

    private applyFill() {
        if (this.color) {
            this.element?.nativeElement.querySelector('svg')?.setAttribute('fill', `var(--${this.color})`);
        } else {
            this.element?.nativeElement.querySelector('svg')?.removeAttribute('fill');
        }
    }

    private get displaySize(): number {
        if (this.deviceService.isDesktop()) {
            return this._desktopSize ?? this._size;
        } else if (this.deviceService.isTablet()) {
            return this._tabletSize ?? this._size;
        } else if (this.deviceService.isTabletPortrait()) {
            return this._tabletPortraitSize ?? this._size;
        } else {
            return this._phoneSize ?? this._size;
        }
    }
}
