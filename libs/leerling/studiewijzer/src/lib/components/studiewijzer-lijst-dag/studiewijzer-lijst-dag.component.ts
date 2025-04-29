import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { HmyDatePipe, NotificationSolidComponent, PillComponent, SpinnerComponent } from 'harmony';
import { IconChevronBoven, provideIcons } from 'harmony-icons';
import { ElementRefProvider } from 'leerling-util';
import { derivedAsync } from 'ngxtension/derived-async';
import { StudiewijzerDag } from '../../services/studiewijzer-model';
import { StudiewijzerService } from '../../services/studiewijzer.service';
import { AantalAfgevinktAriaPipe, AantalAfgevinktPipe } from '../directives/aantal-afgevinkt.pipe';
import { AllesAfgevinktPipe } from '../directives/alles-afgevinkt.pipe';
import { StudiewijzerItemsComponent } from '../studiewijzer-items/studiewijzer-items.component';

@Component({
    selector: 'sl-studiewijzer-lijst-dag',
    standalone: true,
    imports: [
        CommonModule,
        StudiewijzerItemsComponent,
        PillComponent,
        AantalAfgevinktPipe,
        AantalAfgevinktAriaPipe,
        AllesAfgevinktPipe,
        SpinnerComponent,
        HmyDatePipe,
        NotificationSolidComponent
    ],
    templateUrl: './studiewijzer-lijst-dag.component.html',
    styleUrl: './studiewijzer-lijst-dag.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronBoven)]
})
export class StudiewijzerLijstDagComponent implements ElementRefProvider {
    dag = input.required<StudiewijzerDag>();
    showLoadingSpinner = input<boolean>(false);
    headerOffset = input.required<number>();
    initialLoadCompleted = input<boolean>();

    private _studiewijzerService = inject(StudiewijzerService);
    public elementRef = inject(ElementRef);

    public toonAfvinkKnop = this._studiewijzerService.isAfvinkenToegestaan();

    public dagitems = derivedAsync(() => this._studiewijzerService.getStudiewijzerItems(this.dag().datum));
}
