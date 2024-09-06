import { ChangeDetectionStrategy, Component, Signal, computed } from '@angular/core';
import { IconInformatie, IconName, IconNoRadio, IconSluiten, IconWaarschuwing, IconYesRadio, provideIcons } from 'harmony-icons';
import { Toast } from 'ngx-toastr';
import { IconDirective } from '../icon/icon.directive';

@Component({
    selector: 'hmy-toast',
    standalone: true,
    imports: [IconDirective],
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconSluiten, IconInformatie, IconWaarschuwing, IconNoRadio, IconYesRadio)]
})
export class ToastComponent extends Toast {
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
