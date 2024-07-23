import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, OnDestroy, OnInit, inject, input } from '@angular/core';
import { isSameDay, isWeekend } from 'date-fns';
import { DeviceService, SpinnerComponent } from 'harmony';
import { ElementRefProvider, RefreshService, ResizeObserverService } from 'leerling-util';
import { derivedAsync } from 'ngxtension/derived-async';
import { BehaviorSubject, combineLatest, map, of, startWith, timer } from 'rxjs';
import { ROOSTER_TIJDLIJN_LABELS, berekenHuidigeTijdlijnTop } from '../../rooster-util';
import { RoosterService } from '../../services/rooster.service';
import { RoosterItemComponent } from '../rooster-item/rooster-item.component';
import { RoosterTijdenComponent } from '../rooster-tijden/rooster-tijden.component';
import { RoosterItemMetPositie, mapToRoosterItemsMetPositie } from './rooster-item-positie-util';

@Component({
    selector: 'sl-rooster-dag',
    standalone: true,
    imports: [CommonModule, RoosterTijdenComponent, RoosterItemComponent, SpinnerComponent],
    templateUrl: './rooster-dag.component.html',
    styleUrls: ['./rooster-dag.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoosterDagComponent implements OnInit, ElementRefProvider, OnDestroy {
    public elementRef = inject(ElementRef);
    private _roosterService = inject(RoosterService);
    private _deviceService = inject(DeviceService);
    private _elementRef = inject(ElementRef);
    private _resizeObserverService = inject(ResizeObserverService);
    private _resumeRefreshService = inject(RefreshService);

    public datum = input.required<Date>();

    public showLoadingSpinner = input(false);
    public customTabindex = input(0);

    public items = derivedAsync(() => {
        const afspraken$ = this._roosterService.getRoosterVoorDag(this.datum()).pipe(map((rooster) => rooster?.dagen[0].afspraken));
        return combineLatest([afspraken$, this._onResizeSubject]).pipe(
            map(([items]) => mapToRoosterItemsMetPositie(items, this._elementRef.nativeElement.getBoundingClientRect().width))
        );
    });

    public huidigeTijdlijnTop = derivedAsync(() => {
        const toonTijdlijn = isSameDay(this.datum(), new Date());
        if (!toonTijdlijn) return of(undefined);

        const secondenTotVolgendeMin = (60 - new Date().getSeconds()) * 1000;
        return combineLatest([
            this._deviceService.onDeviceChange$,
            timer(secondenTotVolgendeMin, 60000).pipe(startWith(0)),
            this._resumeRefreshService.onRefresh()
        ]).pipe(
            map(() => {
                const nu = new Date();
                return nu.getHours() < 5 || nu.getHours() > 17 ? undefined : `${berekenHuidigeTijdlijnTop()}px`;
            }),
            startWith(`${berekenHuidigeTijdlijnTop()}px`)
        );
    });

    @HostBinding('class.weekend') private get _isWeekend(): boolean {
        return isWeekend(this.datum());
    }

    public labels = ROOSTER_TIJDLIJN_LABELS;

    private _onResizeSubject = new BehaviorSubject<number>(0);

    ngOnInit(): void {
        this._resizeObserverService.observe(this._elementRef.nativeElement, () => {
            this._onResizeSubject.next(0);
        });
    }

    ngOnDestroy(): void {
        this._resizeObserverService.unobserve(this._elementRef.nativeElement);
    }

    trackByRoosterItem(index: number, item: RoosterItemMetPositie): string {
        return item.roosterItem.uniqueIdentifier;
    }
}
