import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName } from 'harmony-icons';
import { toCssVar } from '../css-var-pipe/css-var.pipe';
import { IconDirective, IconSize } from '../icon/icon.directive';
import { ColorToken } from '../tokens/color-token';

@Component({
    selector: 'hmy-icon-plate',
    imports: [CommonModule, IconDirective],
    templateUrl: './icon-plate.component.html',
    styleUrls: ['./icon-plate.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[style.--icon-bg-color]': 'toCssVar(iconBgColor())',
        '[class.no-icon-bg]': 'withoutBackground()'
    }
})
export class IconPlateComponent {
    icon = input<IconName>('persoon');
    size = input<IconSize>('medium');
    iconBgColor = input<ColorToken>('bg-elevated-weak');
    withoutBackground = input<boolean>(false);

    toCssVar = toCssVar;

    get iconColor(): ColorToken | undefined {
        switch (this.iconBgColor()) {
            case 'bg-positive-weak':
                return 'fg-on-positive-weak';
            case 'bg-primary-weak':
                return 'fg-on-primary-weak';
            case 'bg-alternative-weak':
                return 'fg-on-alternative-weak';
            case 'bg-warning-weak':
                return 'fg-on-warning-weak';
            default:
                return undefined;
        }
    }
}
