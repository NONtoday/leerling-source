import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, effect, inject, input, output } from '@angular/core';
import { ButtonComponent, ButtonMode, MessageBarComponent, ModalService, SpinnerComponent } from 'harmony';
import { SafePipe } from './safe-pipe';

@Component({
    selector: 'sl-interactive-guard',
    imports: [CommonModule, ButtonComponent, MessageBarComponent, SpinnerComponent, SafePipe],
    templateUrl: './interactive-guard.component.html',
    styleUrl: './interactive-guard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractiveGuardComponent {
    private _modalService = inject(ModalService);

    text = input.required<string>();
    subtext = input<string | string[] | undefined>();
    url = input<string>();
    foutmelding = input<string>();
    loading = input<boolean>();
    toonSubtext = input<boolean>(false);
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
                this.sluiten();
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
