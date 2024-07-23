import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { DeviceService, PillComponent, SpinnerComponent } from 'harmony';
import { IconChevronBoven, provideIcons } from 'harmony-icons';
import { ElementRefProvider, SlDatePipe } from 'leerling-util';
import { derivedAsync } from 'ngxtension/derived-async';
import { map } from 'rxjs';
import { StudiewijzerDag } from '../../services/studiewijzer-model';
import { StudiewijzerService } from '../../services/studiewijzer.service';
import { AantalAfgevinktAriaPipe, AantalAfgevinktPipe } from '../directives/aantal-afgevinkt.pipe';
import { AllesAfgevinktPipe } from '../directives/alles-afgevinkt.pipe';
import { SelectedFilters, filterStudiewijzerItems } from '../filter/filter';
import { StudiewijzerItemsComponent } from '../studiewijzer-items/studiewijzer-items.component';

@Component({
    selector: 'sl-studiewijzer-dag',
    standalone: true,
    imports: [
        CommonModule,
        StudiewijzerItemsComponent,
        PillComponent,
        AantalAfgevinktPipe,
        AantalAfgevinktAriaPipe,
        AllesAfgevinktPipe,
        SpinnerComponent,
        SlDatePipe
    ],
    templateUrl: './studiewijzer-dag.component.html',
    styleUrl: './studiewijzer-dag.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronBoven)]
})
export class StudiewijzerDagComponent implements ElementRefProvider {
    @ViewChild('dagHeader', { read: ElementRef }) dagHeader: ElementRef;

    dag = input.required<StudiewijzerDag>();
    showLoadingSpinner = input<boolean>(false);
    activeFilters = input<SelectedFilters>({ swiType: [], vak: [] });

    public peildatumChange = output<Date>();

    private _deviceService = inject(DeviceService);
    private _studiewijzerService = inject(StudiewijzerService);
    public elementRef = inject(ElementRef);

    public isMobileOrPortrait = toSignal(this._deviceService.isTabletOrDesktop$.pipe(map((value) => !value)), {
        initialValue: this._deviceService.isPhoneOrTabletPortrait()
    });

    public periode = computed(() => {
        const begin = format(startOfWeek(this.dag().datum, { weekStartsOn: 1 }), 'd', { locale: nl });
        const eind = format(endOfWeek(this.dag().datum, { weekStartsOn: 1 }), 'd MMM', { locale: nl }).replace('.', '');
        return `${begin} t/m ${eind}`;
    });

    public ariaPeriode = computed(() => {
        const begin = format(startOfWeek(this.dag().datum, { weekStartsOn: 1 }), 'd', { locale: nl });
        const eind = format(endOfWeek(this.dag().datum, { weekStartsOn: 1 }), 'd MMMM', { locale: nl }).replace('.', '');
        return `${begin} tot en met ${eind}`;
    });

    public toonAfvinkKnop = this._studiewijzerService.isAfvinkenToegestaan();

    private _weekitems = derivedAsync(() => this._studiewijzerService.getWeekItems(this.dag().datum));
    public weekitems = computed(() => this._weekitems()?.filter((item) => filterStudiewijzerItems(item, this.activeFilters())));

    private _dagitems = derivedAsync(() => this._studiewijzerService.getStudiewijzerItems(this.dag().datum));
    public dagitems = computed(() => this._dagitems()?.filter((item) => filterStudiewijzerItems(item, this.activeFilters())));

    formatDate(): number | string {
        if (this.isMobileOrPortrait()) {
            const formattedDate = format(this.dag().datum, 'EEEE d MMMM', { locale: nl });
            return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        } else {
            return this.dag().isEersteDag ? format(this.dag().datum, 'd MMM', { locale: nl }).replace('.', '') : this.dag().datum.getDate();
        }
    }
}
