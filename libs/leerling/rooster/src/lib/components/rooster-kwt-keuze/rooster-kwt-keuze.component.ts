import { CommonModule, I18nPluralPipe } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostBinding,
    HostListener,
    computed,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import { collapseOnLeaveAnimation, expandOnEnterAnimation } from 'angular-animations';
import { IconDirective, IconPillComponent } from 'harmony';
import { IconBoek, IconKlok, IconLocatie, IconPersoon, IconYesRadio, provideIcons } from 'harmony-icons';
import { AppStatusService } from 'leerling-app-status';
import { AuthenticationService } from 'leerling-authentication';
import { AccessibilityService } from 'leerling-util';
import { SAfspraakActie } from 'leerling/store';

import { kwtHerhalingLabelPipe } from '../rooster-kwt-inschrijven/kwt-herhaling-label.pipe';
import { pluralMapping } from './plural-mapping';
import { toInschrijfdatumPipe } from './to-inschrijfdatum-pipe';
import { toLestijdPipe } from './to-lestijd.pipe';

const ANIMATIONS = [expandOnEnterAnimation(), collapseOnLeaveAnimation()];

@Component({
    selector: 'sl-rooster-kwt-keuze',
    imports: [CommonModule, IconDirective, IconPillComponent, I18nPluralPipe, toLestijdPipe, toInschrijfdatumPipe, kwtHerhalingLabelPipe],
    templateUrl: './rooster-kwt-keuze.component.html',
    styleUrl: './rooster-kwt-keuze.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconKlok, IconLocatie, IconBoek, IconPersoon, IconYesRadio)],
    animations: ANIMATIONS
})
export class RoosterKwtKeuzeComponent implements AfterViewInit {
    private _accessibilityService = inject(AccessibilityService);
    private _authenticationService = inject(AuthenticationService);
    public elementRef = inject(ElementRef);

    public afspraakActie = input.required<SAfspraakActie>();

    public actieGeselecteerd = output<SAfspraakActie>();

    public geselecteerd = signal(false);
    public toonDetails = signal(false);
    public isAccessedByKeyboard = computed(() => this._accessibilityService.isAccessedByKeyboard());
    public isOnline = inject(AppStatusService).isOnlineSignal();
    public isVol = computed(() => this.afspraakActie().beschikbarePlaatsen === 0);
    public isOuderVerzorger = this._authenticationService.isCurrentContextOuderVerzorger;
    private isToegestaan = computed(() => this.afspraakActie().toegestaan);
    private isDisabled = computed(() => this.isVol() || !this.isToegestaan() || !this.isOnline());

    public pluralMapping = pluralMapping;

    ngAfterViewInit() {
        if (this.afspraakActie()?.ingeschreven) {
            this.geselecteerd.set(true);
        }
    }

    @HostBinding('class.selected') get details() {
        return this.geselecteerd();
    }

    @HostBinding('class.disabled') get disabled() {
        return this.isDisabled();
    }

    @HostBinding('class.verzorger') get verzorger() {
        return this.isOuderVerzorger;
    }

    @HostListener('click')
    public toggleGekozen() {
        if (this.disabled || this.isOuderVerzorger) return;
        this.actieGeselecteerd.emit(this.afspraakActie());
    }

    public toggleDetails(event: Event) {
        event.stopPropagation();
        if (this.disabled) return;
        this.toonDetails.set(!this.toonDetails());
    }
}
