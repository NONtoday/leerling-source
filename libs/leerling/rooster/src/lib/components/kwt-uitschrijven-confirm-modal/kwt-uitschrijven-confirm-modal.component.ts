import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Output,
    computed,
    effect,
    inject,
    input,
    output,
    untracked
} from '@angular/core';
import { ButtonComponent, ButtonMode, ErrorBarComponent, ModalService, SpinnerComponent } from 'harmony';

@Component({
    selector: 'sl-kwt-uitschrijven-confirm-modal',
    standalone: true,
    imports: [CommonModule, ButtonComponent, CdkTrapFocus, ErrorBarComponent, SpinnerComponent],
    templateUrl: './kwt-uitschrijven-confirm-modal.component.html',
    styleUrl: './kwt-uitschrijven-confirm-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KwtUitschrijvenConfirmModalComponent {
    private _modalService = inject(ModalService);

    text = input.required<string>();
    subtext = input<string | string[] | undefined>();
    foutmelding = input<string | undefined>();
    loading = input<boolean>();
    annulerenButtonText = input<string>('Annuleren');
    bevestigenButtonText = input<string>('Bevestigen');
    bevestigenButtonMode = input<ButtonMode>('delete');
    shouldCloseAfterConfirm = input<boolean | undefined>(true);

    @Output() confirm = new EventEmitter<boolean>();
    onClose = output<void>();

    public isBevestigenPrimaryOrSecondary = computed(
        () => this.bevestigenButtonMode() === 'primary' || this.bevestigenButtonMode() === 'secondary'
    );

    constructor() {
        effect(() => {
            if (this.shouldCloseAfterConfirm()) {
                untracked(() => this.sluiten());
            }
        });
    }

    annulerenClick() {
        this.sluiten();
    }

    bevestigenClick() {
        this.confirm.emit(true);
    }

    sluiten() {
        if (this.loading()) return;
        this.onClose.emit();
        this._modalService.animateAndClose();
    }
}
