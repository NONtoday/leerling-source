import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewContainerRef, inject, output, viewChild } from '@angular/core';
import { IconDirective, OverlayService, VerwijderConfirmationComponent, createPopupSettings } from 'harmony';
import { IconMarkerenOngelezen, IconVerwijderen, provideIcons } from 'harmony-icons';

@Component({
    selector: 'sl-bericht-acties',
    standalone: true,
    imports: [CommonModule, IconDirective],
    templateUrl: './bericht-acties.component.html',
    styleUrl: './bericht-acties.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconMarkerenOngelezen, IconVerwijderen)]
})
export class BerichtActiesComponent {
    overlayService = inject(OverlayService);

    verwijderActie = viewChild.required('verwijderActie', { read: ViewContainerRef });

    markeerOngelezen = output();
    verwijder = output();

    openVerwijderConfirm() {
        const popup = this.overlayService.popupOrModal(
            VerwijderConfirmationComponent,
            this.verwijderActie(),
            { label: 'Gesprek verwijderen?' },
            createPopupSettings({
                width: '200px',
                alignment: 'center',
                elementOffset: 48,
                position: 'left'
            })
        ) as VerwijderConfirmationComponent;
        popup.confirmed.subscribe(() => this.verwijder.emit());
        popup.canceled.subscribe(() => this.overlayService.close(this.verwijderActie()));
    }
}
