import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EmbeddedViewRef,
    TemplateRef,
    ViewContainerRef,
    inject,
    input,
    viewChild
} from '@angular/core';
import { DeviceService, IconDirective, OverlayService } from 'harmony';
import { IconChevronOnder, IconReacties, provideIcons } from 'harmony-icons';
import { MaatregelItemAriaLabelPipe, MaatregelItemComponent } from 'leerling-registraties-ui';
import { SMaatregelToekenning } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';

@Component({
    selector: 'sl-rooster-maatregelen',
    imports: [CommonModule, IconDirective, MaatregelItemComponent, CdkTrapFocus],
    providers: [provideIcons(IconReacties, IconChevronOnder)],
    templateUrl: './rooster-maatregelen.component.html',
    styleUrl: './rooster-maatregelen.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        role: 'button',
        '[attr.aria-label]': 'ariaLabel()',
        '(click)': 'openOverlay()'
    }
})
export class RoosterMaatregelenComponent {
    private _deviceService = inject(DeviceService);
    private _overlayService = inject(OverlayService);
    private _host = inject(ViewContainerRef);
    private _maatregelenOverlay = viewChild('maatregelenOverlay', { read: TemplateRef });

    maatregelen = input<SMaatregelToekenning[]>([]);

    ariaLabel = derivedAsync(() => {
        if (this.maatregelen().length === 1) {
            const labelPipe = new MaatregelItemAriaLabelPipe();
            return labelPipe.transform(this.maatregelen()[0]);
        }
        return `${this.maatregelen().length} maatregelen`;
    });

    openOverlay() {
        if (!this._overlayService.isOpen(this._host)) {
            const overlay = this._maatregelenOverlay() as TemplateRef<any>;
            const width = this._host.element.nativeElement.clientWidth;

            const overlayElement: EmbeddedViewRef<any> = this._overlayService.popupOrModal({
                template: overlay,
                element: this._host,
                popupSettings: {
                    alignment: 'start',
                    animation: 'slide',
                    width: `${Math.max(width, 264)}px`,
                    maxHeight: '380px'
                },
                modalSettings: {
                    contentPadding: 0,
                    title: this.maatregelen().length > 1 ? 'Maatregelen' : 'Maatregel'
                }
            });

            const overlayClass = this._deviceService.isTabletOrDesktop() ? 'in-popup' : 'in-modal';
            overlayElement.rootNodes[0].classList.add(overlayClass);
            overlayElement.rootNodes[0].childNodes?.[0].focus();
        }
    }
}
