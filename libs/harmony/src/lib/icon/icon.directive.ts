import { computed, Directive, effect, ElementRef, inject, input, Renderer2, SecurityContext, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { HARMONY_ICONS, IconName } from 'harmony-icons';
import { isMap } from 'lodash-es';
import { filter, fromEvent, merge } from 'rxjs';
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
export class IconDirective {
    private readonly element = inject(ElementRef);
    private readonly deviceService = inject(DeviceService);
    private readonly renderer = inject(Renderer2);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly icons = inject(HARMONY_ICONS);

    private isHovering = signal(false);

    public hmyIcon = input.required<IconName>();

    private readonly icon = computed(() => {
        const iconName = this.hmyIcon();
        // de !isMap check is omdat in unit tests met een overrideComponent een object uit de provider komt (geen idee waarom - lijkt een bug)
        if (!iconName || !isMap(this.icons)) return;
        const icon = this.icons.get(iconName);
        if (!icon) {
            console.error(`👀 we could not find the Icon with the name ${iconName}, did you add it to the Icon registry?`);
            return;
        }
        return icon;
    });

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

    /**
     * Size van het icoon. Groottes zijn in px:
     *
     * - smallest = 12px;
     * - small = 16px;
     * - medium = 20px;
     * - large = 24px;
     **/
    public readonly size = input<IconSize>('small');
    /**
     * Werking als volgt:
     *      - ['small] => alles small
     *      - ['small', 'medium'] => Phone small, de rest medium
     *      - ['small', 'medium', 'large'] => Phone small, tabletPortrait medium, de rest large
     *      - ['small', 'medium', 'large', 'application'] => Phone small, tabletPortrait medium, tablet large en desktop application
     */
    public readonly sizes = input<IconSize[] | null>(null);
    public readonly sizeInPx = input<number | undefined>(undefined);
    public readonly sizesInPx = input<number[] | undefined>(undefined);

    private readonly displaySize = computed(() => {
        if (this.sizeInPx()) {
            return this.sizeInPx();
        }
        const currentDevice = this.deviceService.currentDevice();
        const useSizes = this.sizes() ?? this.sizesInPx();
        if (useSizes) {
            const phoneSize = useSizes[0];
            const tabletPortraitSize = useSizes[1] ?? phoneSize;
            const tabletSize = useSizes[2] ?? tabletPortraitSize;
            const desktopSize = useSizes[3] ?? tabletSize;

            const deviceSize = match(currentDevice)
                .with('phone', () => phoneSize)
                .with('tabletPortrait', () => tabletPortraitSize)
                .with('tablet', () => tabletSize)
                .with('desktop', () => desktopSize)
                .exhaustive();

            return this.getSizeInPx(deviceSize);
        }
        return this.getSizeInPx(this.size());
    });

    private getSizeInPx(value: IconSize | number): number {
        if (typeof value === 'number') return value;
        return match(value)
            .with('smallest', () => SMALLEST_PX)
            .with('small', () => SMALL_PX)
            .with('medium', () => MEDIUM_PX)
            .with('large', () => LARGE_PX)
            .with('largest', () => LARGEST_PX)
            .otherwise(() => SMALL_PX);
    }

    private readonly derivedHoverColor = computed(() => {
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
    });

    private readonly displayColor = computed(() => {
        if (this.isHoverable() && this.isHovering()) {
            return this.hoverColorOverwrite() ?? this.derivedHoverColor();
        }
        return this.color();
    });

    constructor() {
        this.renderer.addClass(this.element.nativeElement, 'svg');
        this.renderer.appendChild(this.element.nativeElement, this.renderer.createElement('div'));

        effect(() => {
            const icon = this.icon();
            if (icon) {
                this.element.nativeElement.querySelector('div').innerHTML = this.sanitizer.sanitize(SecurityContext.STYLE, icon) ?? '';
                this.element.nativeElement.setAttribute('icon', this.hmyIcon());

                const color = this.displayColor();
                if (color) {
                    this.element?.nativeElement.querySelector('svg')?.setAttribute('fill', `var(--${color})`);
                } else {
                    this.element?.nativeElement.querySelector('svg')?.removeAttribute('fill');
                }
                this.element?.nativeElement.querySelector('svg')?.setAttribute('display', `block`);
                this.element?.nativeElement.querySelector('svg')?.setAttribute('height', `${this.displaySize()}px`);
                this.element?.nativeElement.querySelector('svg')?.setAttribute('width', `${this.displaySize()}px`);
            }
        });

        merge(fromEvent(this.element.nativeElement, 'mouseenter'), fromEvent(this.element.nativeElement, 'mouseleave'))
            .pipe(
                filter(() => this.isHoverable() && window.matchMedia('(hover: hover)').matches),
                takeUntilDestroyed()
            )
            .subscribe((event: MouseEvent) => (event.type === 'mouseenter' ? this.isHovering.set(true) : this.isHovering.set(false)));
    }
}
