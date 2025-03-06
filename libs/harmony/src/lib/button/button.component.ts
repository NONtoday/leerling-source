import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconName } from 'harmony-icons';
import { match } from 'ts-pattern';
import { ClassOnClickDirective } from '../directives/class-on-click.directive';
import { IconDirective, IconSize } from '../icon/icon.directive';
import { SpinnerComponent } from '../spinner/spinner.component';
import { ColorToken } from '../tokens/color-token';

export type ButtonMode = 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'delete' | 'add';

export type ButtonType = 'button' | 'submit' | 'reset';

export type ButtonSize = 'normal' | 'small' | 'smallest';

export type JustifyContent = 'center' | 'space-between';

@Component({
    selector: 'hmy-button',
    imports: [CommonModule, ClassOnClickDirective, IconDirective, SpinnerComponent],
    templateUrl: './button.component.html',
    styleUrls: ['./button.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
    public label = input.required<string>();
    public mode = input<ButtonMode>('primary');
    public type = input<ButtonType>('button');
    public size = input<ButtonSize>('normal');
    public showSpinner = input(false);
    public isSpinnerWhite = computed(() => this.mode() === 'primary' || this.mode() === 'secondary');
    public disabled = input(false);
    public customTabindex = input<string>();

    public justifyContent = input<JustifyContent>('center');
    public iconLeft = input<IconName>();
    public iconLeftSize = input<IconSize>('medium');
    public iconRight = input<IconName>();
    public iconRightSize = input<IconSize>('medium');

    public disabledOrMode = computed(() => (this.disabled() ? 'disabled' : this.mode()));
    public leftIconMargin = computed(() => (this.iconLeft() && this.justifyContent() === 'center' ? '8px' : null));
    public rightIconMargin = computed(() => (this.iconRight() && this.justifyContent() === 'center' ? '8px' : null));

    get getLabelColor(): ColorToken {
        return match(this.mode())
            .returnType<ColorToken>()
            .with('primary', () => 'fg-on-positive-normal')
            .with('secondary', () => 'fg-on-primary-normal')
            .with('tertiary', () => 'action-primary-normal')
            .with('quaternary', () => 'action-neutral-normal')
            .with('delete', () => 'fg-on-negative-weak')
            .with('add', () => 'fg-on-positive-normal')
            .exhaustive();
    }
}
