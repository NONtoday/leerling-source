import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, input } from '@angular/core';
import { IconName, IconWaarschuwing, provideIcons } from 'harmony-icons';
import { ButtonComponent, ButtonMode } from '../button/button.component';
import { HtmlContentComponent } from '../html-content/html-content.component';
import { ModalService } from '../overlay/modal/service/modal.service';

@Component({
    selector: 'hmy-confirm-modal',
    imports: [CommonModule, ButtonComponent, HtmlContentComponent],
    providers: [provideIcons(IconWaarschuwing)],
    templateUrl: './confirm-modal.component.html',
    styleUrl: './confirm-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmModalComponent implements OnInit {
    private _modalService = inject(ModalService);

    text = input.required<string>();
    annulerenButtonText = input<string>('Annuleren');
    bevestigenButtonText = input<string>('Bevestigen');
    bevestigenButtonMode = input<ButtonMode>('delete');
    bevestigenButtonIcon = input<IconName | undefined>(undefined);

    @Output() confirmResult = new EventEmitter<ConfirmResult>();

    ngOnInit(): void {
        this._modalService.onClose(() => this.confirmResult.emit('Closed'));
    }

    annulerenClick() {
        this.confirmResult.emit('Negative');
        this._modalService.animateAndClose();
    }

    bevestigenClick() {
        this.confirmResult.emit('Positive');
        this._modalService.animateAndClose();
    }
}

export type ConfirmResult = 'Positive' | 'Negative' | 'Closed';
