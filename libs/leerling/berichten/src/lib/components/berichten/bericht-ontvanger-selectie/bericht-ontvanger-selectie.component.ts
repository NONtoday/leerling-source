import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    TemplateRef,
    ViewContainerRef,
    computed,
    effect,
    forwardRef,
    inject,
    signal,
    viewChild
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AutoFocusDirective, DeviceService, ModalService, PopupService, TagComponent, createPopupSettings, isPresent } from 'harmony';
import { onRefresh } from 'leerling-util';
import { SMedewerker } from 'leerling/store';
import { derivedAsync } from 'ngxtension/derived-async';
import * as removeAccents from 'remove-accents';
import { Subject, filter } from 'rxjs';
import { BerichtService } from '../../../services/bericht.service';
import { BerichtOntvangerOptieComponent } from '../bericht-ontvanger-optie/bericht-ontvanger-optie.component';
import { MedewerkerToBoodschapCorrespondentPipe } from '../medewerker-to-boodschap-correspondent-pipe/medewerker-to-boodschap-correspondent.pipe';
import { MedewerkerVolledigeNaamPipe } from '../medewerker-volledige-naam-pipe/medewerker-volledige-naam.pipe';

@Component({
    selector: 'sl-bericht-ontvanger-selectie',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TagComponent,
        BerichtOntvangerOptieComponent,
        MedewerkerVolledigeNaamPipe,
        AutoFocusDirective,
        MedewerkerToBoodschapCorrespondentPipe,
        A11yModule
    ],
    templateUrl: './bericht-ontvanger-selectie.component.html',
    styleUrl: './bericht-ontvanger-selectie.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => BerichtOntvangerSelectieComponent),
            multi: true
        },
        BerichtService
    ],
    host: {
        '(window:keydown.escape)': 'closeSelectie()'
    }
})
export class BerichtOntvangerSelectieComponent implements ControlValueAccessor {
    public textInput = viewChild.required('textInput', { read: ViewContainerRef });
    public ontvangers = signal<SMedewerker[]>([]);
    public onChange$ = new Subject<void>();
    public search = signal('');
    public toegestaneOntvangers = derivedAsync(() => this._berichtService.getToegestaneOntvangers().pipe(filter(isPresent)), {
        initialValue: []
    });
    public searchResults = computed(() => this.filterMedewerkers(this.toegestaneOntvangers(), this.search(), this.ontvangers()));

    private zoekresultatenPopup = viewChild.required('zoekresultatenPopup', { read: TemplateRef });

    private _changeDetectorRef = inject(ChangeDetectorRef);
    private _berichtService = inject(BerichtService);
    private _popupService = inject(PopupService);
    private _modalService = inject(ModalService);
    public deviceService = inject(DeviceService);

    public hasPlaceholder = computed(() => this.ontvangers().length === 0);
    public placeholderText = computed(() => {
        if (this.hasPlaceholder()) {
            return this.deviceService.isTabletOrDesktop() ? 'Aan wie wil je het sturen? (verplicht)' : 'Aan wie wil je het sturen?';
        }
        return '';
    });

    constructor() {
        onRefresh(() => this._berichtService.refreshToegestaneOntvangers());
        effect(
            () => {
                if (this.search().length > 0) {
                    this.openSearchOptions();
                }
            },
            { allowSignalWrites: true }
        );
    }

    selectMedewerker(medewerker: SMedewerker) {
        this.writeValue([...this.ontvangers(), medewerker]);
        this._popupService.close(this.textInput());
        this.textInput().element.nativeElement.focus();
        this.search.set('');
    }

    verwijderMedewerker(medewerker: SMedewerker) {
        this.writeValue(this.ontvangers().filter((ontvanger) => ontvanger !== medewerker));
        this.search.set('');
    }

    deleteLaatsteOntvanger() {
        if (this.search().length > 0) {
            return;
        }
        const laatsteMedewerker = this.ontvangers()[this.ontvangers().length - 1];
        this.verwijderMedewerker(laatsteMedewerker);
    }

    openSearchOptions() {
        if (!this._popupService.isOpen(this.textInput())) {
            const popupSettings = this.deviceService.isTabletOrDesktop()
                ? createPopupSettings({ alignment: 'start', width: '344px', domPosition: 'sibling' })
                : createPopupSettings({ left: 16, maxWidth: '344px', domPosition: 'sibling' });

            this._popupService.popup({ template: this.zoekresultatenPopup(), element: this.textInput(), settings: popupSettings });
        }
    }

    closeSelectie = () => {
        if (this._popupService.isOpen(this.textInput())) {
            this._popupService.close(this.textInput());
            this.textInput().element.nativeElement.focus();
        }
    };

    activateInput = () => {
        if (!this._modalService.isOpen()) {
            this.textInput().element.nativeElement.focus();
            this.openSearchOptions();
        }
    };

    get value() {
        return this.ontvangers();
    }

    set value(ontvangers: SMedewerker[]) {
        this.ontvangers.set(ontvangers);

        this.onChange$.next();
        this.onChange(ontvangers);
        this._changeDetectorRef.detectChanges();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function, no-unused-vars
    onChange = (ontvangers: SMedewerker[]) => {};

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onTouched = () => {};

    writeValue(obj: SMedewerker[]): void {
        if (obj) {
            this.value = obj;
        } else {
            this.value = [];
        }
    }
    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    private filterMedewerkers = (medewerkers: SMedewerker[], search: string, selectedMedewerkers: SMedewerker[]) => {
        const possibleResults = medewerkers.filter((medewerker) => !selectedMedewerkers.includes(medewerker));

        if (!search) {
            return possibleResults;
        }
        //accenten verwijderen, lowercase, punten en () weghalen
        const searchLower = removeAccents.remove(search.toLowerCase().split('.').join('').replace('(', '').replace(')', '')).trim();

        return possibleResults.filter((medewerker) => medewerker.zoekNaam?.includes(searchLower));
    };
}
