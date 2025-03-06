import { ChangeDetectionStrategy, Component, ElementRef, Signal, computed, inject } from '@angular/core';
import { IconInformatie, IconName, IconNoRadio, IconSluiten, IconWaarschuwing, IconYesRadio, provideIcons } from 'harmony-icons';
import { Toast } from 'ngx-toastr';
import { IconDirective } from '../icon/icon.directive';

export const HARMONY_TOAST_SELECTOR = 'hmy-toast';
@Component({
    selector: HARMONY_TOAST_SELECTOR,
    imports: [IconDirective],
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconSluiten, IconInformatie, IconWaarschuwing, IconNoRadio, IconYesRadio)]
})
export class ToastComponent extends Toast {
    public elementRef = inject(ElementRef);

    icon: Signal<IconName | undefined> = computed(() => {
        if (this.toastClasses.includes('toast-success')) {
            return 'yesRadio';
        } else if (this.toastClasses.includes('toast-error')) {
            return 'noRadio';
        } else if (this.toastClasses.includes('toast-info')) {
            return 'informatie';
        } else if (this.toastClasses.includes('toast-warning')) {
            return 'waarschuwing';
        }
        return undefined;
    });
}
