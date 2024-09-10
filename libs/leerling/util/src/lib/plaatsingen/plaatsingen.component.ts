import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    HostBinding,
    HostListener,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    ViewContainerRef,
    inject,
    output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { IconDirective } from 'harmony';
import { IconChevronOnder, provideIcons } from 'harmony-icons';
import { SPlaatsing } from 'leerling/store';
import { orderBy } from 'lodash-es';
import { map } from 'rxjs';
import { AccessibilityService } from '../accessibility/accessibility.service';
import { createPopupSettings } from '../popup/popup-settings';
import { PopupService } from '../popup/service/popup.service';
import { PlaatsingItemComponent } from './plaatsing-item/plaatsing-item.component';
import { PlaatsingListComponent } from './plaatsing-list.component';

export const PLAATSING_COMPONENT_TABINDEX = 110;

@Component({
    selector: 'sl-plaatsingen',
    standalone: true,
    imports: [CommonModule, IconDirective, PlaatsingItemComponent],
    templateUrl: './plaatsingen.component.html',
    styleUrls: ['./plaatsingen.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconChevronOnder)]
})
export class PlaatsingenComponent implements OnChanges, OnDestroy, OnInit {
    private _router = inject(Router);
    private _activatedRoute = inject(ActivatedRoute);
    private _changeDetector = inject(ChangeDetectorRef);
    private _viewContainerRef = inject(ViewContainerRef);
    private _popupService = inject(PopupService);
    private _accessibilityService = inject(AccessibilityService);
    private _destroyRef = inject(DestroyRef);

    @Input() plaatsingen: SPlaatsing[] = [];
    @Input() geselecteerdePlaatsing: SPlaatsing | undefined;
    @Input() setDefaultHuidigeOfLaatstePlaatsing = true;

    plaatsingGewisseld = output<SPlaatsing | undefined>();

    @HostBinding('class.hoverable') meerderePlaatsingen = false;
    @HostBinding('class.popup-open') _popupOpen = false;

    public sortedPlaatsingen: SPlaatsing[] = [];

    private _plaatsingPopupUuid: string | undefined;

    ngOnInit() {
        this._activatedRoute.queryParams.pipe(map((params) => params['plaatsing'])).subscribe((plaatsingParam) => {
            const huidigePlaatsingUuid = this.geselecteerdePlaatsing?.UUID;
            this.geselecteerdePlaatsing = plaatsingParam
                ? this.plaatsingen.find((plaatsing) => plaatsing.UUID === plaatsingParam)
                : this.plaatsingen.find((plaatsing) => plaatsing.huidig);

            if (this.geselecteerdePlaatsing?.UUID !== huidigePlaatsingUuid) {
                this.plaatsingGewisseld.emit(this.geselecteerdePlaatsing);
                this._changeDetector.detectChanges();
            }
        });

        this._popupService.openPopups$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((openPopups) => {
            this._popupOpen = openPopups.some((popupRef) => popupRef.instance.connectedElement === this._viewContainerRef);
        });

        this.meerderePlaatsingen = this.plaatsingen.length > 1;
    }

    ngOnChanges() {
        if (!this.plaatsingen.some((plaatsing) => plaatsing.UUID === this.geselecteerdePlaatsing?.UUID)) {
            this.geselecteerdePlaatsing = undefined;
        }

        if (!this.geselecteerdePlaatsing && this.setDefaultHuidigeOfLaatstePlaatsing) {
            const plaatsingParam = this._activatedRoute.snapshot.queryParamMap.get('plaatsing');
            const predicate = plaatsingParam
                ? (plaatsing: SPlaatsing) => plaatsing.UUID === plaatsingParam
                : (plaatsing: SPlaatsing) => plaatsing.huidig;

            this.geselecteerdePlaatsing = this.plaatsingen.find(predicate) ?? this.plaatsingen[0];
            if (this.geselecteerdePlaatsing) {
                this.plaatsingGewisseld.emit(this.geselecteerdePlaatsing);
            }
        }
        this.meerderePlaatsingen = this.plaatsingen.length > 1;
        this.sorteerPlaatsingen();
    }

    private sorteerPlaatsingen() {
        this.sortedPlaatsingen = orderBy(this.plaatsingen, (plaatsing) => plaatsing.vanafDatum, 'desc');
    }

    @HostListener('click') onClick() {
        if (!this.meerderePlaatsingen) return;

        const popup = this._popupService.popup(
            PlaatsingListComponent,
            {
                plaatsingen: this.plaatsingen,
                actievePlaatsing: this.geselecteerdePlaatsing
            },
            this._viewContainerRef,
            createPopupSettings({
                alignment: 'start',
                keepOnNavigation: true
            })
        );
        this._plaatsingPopupUuid = popup.uuid;
        popup.component.plaatsingGewisseld.subscribe((plaatsing) => {
            this._changeDetector.detectChanges();
            this._router.navigate([], { queryParams: { plaatsing: plaatsing.UUID }, queryParamsHandling: 'merge' });
            this._popupService.animateAndClose(popup.uuid);
            if (this._accessibilityService.isAccessedByKeyboard()) {
                this._viewContainerRef.element.nativeElement.focus();
            }
        });
    }

    ngOnDestroy(): void {
        this._plaatsingPopupUuid && this._popupService.close(this._plaatsingPopupUuid);
    }
}
