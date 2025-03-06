import {
    computed,
    Directive,
    effect,
    ElementRef,
    inject,
    Input,
    input,
    NgZone,
    OnDestroy,
    Renderer2,
    SecurityContext,
    signal
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { HARMONY_ICONS, IconName } from 'harmony-icons';
import { isMap } from 'lodash-es';
import { fromEvent, Subject, takeUntil } from 'rxjs';
import { replace, split } from 'string-ts';
import { match } from 'ts-pattern';
import { Optional } from '../optional/optional';
import { DeviceService } from '../services/device.service';
import { ColorToken } from '../tokens/color-token';
import { validColorTokens } from '../tokens/valid-color-tokens';

export type IconHoverColor = ColorToken | 'auto';
export type IconSize = 'smallest' | 'small' | 'medium' | 'large' | 'largest';

export const SMALLEST_PX = 12;
export const SMALL_PX = 16;
export const MEDIUM_PX = 20;
export const LARGE_PX = 24;
export const LARGEST_PX = 33;

@Directive({
    selector: '[hmyIcon]',
    standalone: true
})
export class IconDirective implements OnDestroy {
    private element = inject(ElementRef);
    private deviceService = inject(DeviceService);
    private renderer = inject(Renderer2);
    private sanitizer = inject(DomSanitizer);

    private ngZone = inject(NgZone);

    private _phoneSize: number;
    private _tabletPortraitSize: number;
    private _tabletSize: number;
    private _desktopSize: number;

    /**
     * Values die voor alle devices geldt, wordt niet gebruikt als 'sizes' een value heeft
     */
    private _size = signal(16);

    private displaySize = computed(() => {
        if (this.deviceService.currentDevice() === 'desktop') {
            return this._desktopSize ?? this._size();
        } else if (this.deviceService.currentDevice() === 'tablet') {
            return this._tabletSize ?? this._size();
        } else if (this.deviceService.currentDevice() === 'tabletPortrait') {
            return this._tabletPortraitSize ?? this._size();
        } else {
            return this._phoneSize ?? this._size();
        }
    });

    private readonly icons = inject(HARMONY_ICONS);

    @Input() set sizeInPx(value: number) {
        this._size.set(value);
        this._phoneSize = this._size();
        this._tabletPortraitSize = this._size();
        this._tabletSize = this._size();
        this._desktopSize = this._size();
    }

    @Input() set sizesInPx(value: number[]) {
        this._size.set(value[0]);
        this._phoneSize = value[0];
        this._tabletPortraitSize = value[1] ?? this._phoneSize;
        this._tabletSize = value[2] ?? this._tabletPortraitSize;
        this._desktopSize = value[3] ?? this._tabletSize;
    }

    /**
     * Size van het icoon. Groottes zijn in px:
     *
     * - smallest = 12px;
     * - small = 16px;
     * - medium = 20px;
     * - large = 24px;
     **/
    @Input() set size(value: IconSize) {
        this._size.set(this.getSizeInPx(value));
        this._phoneSize = this._size();
        this._tabletPortraitSize = this._size();
        this._tabletSize = this._size();
        this._desktopSize = this._size();
    }

    /**
     * De kleur van het icoon.
     *
     * De hover kleur wordt automatisch bepaald o.b.v. dit patroon (zie calculateHoverColor methode):
     *
     * - weakest -> weak;
     * - weak -> normal;
     * - normal -> strong;
     * - strong -> max;
     *
     * Bijvoorbeeld: action-primary-normal -> action-primary-strong
     *
     * Het meegeven van een ColorToken is ook mogelijk door de hoverColorOverwrite te setten, dan wordt deze kleur gebruikt als hover kleur.
     * De hoverColor werkt alleen als er ook een color is meegegeven.
     **/
    readonly color = input<Optional<ColorToken>>();

    /**
     * De overwrite voor de hover kleur.
     *
     * Als deze niet is geset wordt de hover kleur automatisch bepaald o.b.v. de color (zie calculateHoverColor methode).
     **/
    readonly hoverColorOverwrite = input<ColorToken>();

    /**
     * Set icon hoverable. Default is false. Kleur wordt bepaald o.b.v. de color input (zie calculateHoverColor methode) of de hoverColorOverwrite input.
     **/
    readonly isHoverable = input<boolean>(false);

    private readonly hoverColor = computed(() =>
        this.isHoverable() ? (this.hoverColorOverwrite() ?? this.calculateHoverColor()) : undefined
    );

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
            this._phoneSize = this._size();
            this._tabletPortraitSize = this._size();
            this._tabletSize = this._size();
            this._desktopSize = this._size();
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
        this.applySize();
        this.applyFill(this.color());
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
            case 'largest':
                return LARGEST_PX;
            default:
                return SMALL_PX;
        }
    }

    constructor() {
        this.renderer.addClass(this.element.nativeElement, 'svg');
        this.deviceService.onDeviceChange$.pipe(takeUntil(this.onDestroy$)).subscribe(() => this.applySize());

        effect(() => {
            this.applyFill(this.color());
            this.applySize();
        });

        // Aparte effect, omdat alleen de kleur bij een hover opnieuw bepaald moet worden
        effect(() => {
            this.ngZone.runOutsideAngular(() => {
                if (this.isHoverable()) {
                    fromEvent(this.element.nativeElement, 'mouseenter')
                        .pipe(takeUntil(this.onDestroy$))
                        .subscribe(() => {
                            this.applyFill(this.hoverColor());
                        });
                    fromEvent(this.element.nativeElement, 'mouseleave')
                        .pipe(takeUntil(this.onDestroy$))
                        .subscribe(() => {
                            this.applyFill(this.color());
                        });
                }
            });
        });
    }

    ngOnDestroy(): void {
        this.onDestroy$.next();
        this.onDestroy$.complete();
    }

    private applySize() {
        const size = this.displaySize();
        this.element?.nativeElement.querySelector('svg')?.setAttribute('display', `block`);
        this.element?.nativeElement.querySelector('svg')?.setAttribute('height', `${size}px`);
        this.element?.nativeElement.querySelector('svg')?.setAttribute('width', `${size}px`);
    }

    private applyFill(color: Optional<ColorToken>) {
        if (color) {
            this.element?.nativeElement.querySelector('svg')?.setAttribute('fill', `var(--${color})`);
        } else {
            this.element?.nativeElement.querySelector('svg')?.removeAttribute('fill');
        }
    }

    private calculateHoverColor(): Optional<ColorToken> {
        const iconColor = this.color();
        // Als er geen color is meegegeven, set dan ook geen hover color
        if (!iconColor) {
            return null;
        }
        const iconColorParts = split(iconColor, '-');
        const colorStrength = iconColorParts[iconColorParts.length - 1] as 'weakest' | 'weak' | 'normal' | 'strong' | 'max';
        const hoverColor = match(colorStrength)
            .with('weakest', () => replace(iconColor, colorStrength, 'weak'))
            .with('weak', () => replace(iconColor, colorStrength, 'normal'))
            .with('normal', () => replace(iconColor, colorStrength, 'strong'))
            .with('strong', () => replace(iconColor, colorStrength, 'max'))
            .otherwise(() => iconColor);

        // Controleer of hoverColor een geldige ColorToken is
        return validColorTokens.has(hoverColor as ColorToken) ? (hoverColor as ColorToken) : null;
    }
}
