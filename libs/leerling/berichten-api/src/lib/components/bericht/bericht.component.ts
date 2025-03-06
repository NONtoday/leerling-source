import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    TemplateRef,
    ViewContainerRef,
    computed,
    effect,
    inject,
    input,
    model,
    output,
    signal,
    viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { collapseAnimation } from 'angular-animations';
import {
    AvatarComponent,
    ButtonComponent,
    DeviceService,
    IconPillComponent,
    PillComponent,
    PopupService,
    SpinnerComponent,
    TagComponent,
    createPopupSettings,
    provideVakIcons,
    stripHtml
} from 'harmony';
import { IconBijlage, IconReply, provideIcons } from 'harmony-icons';
import { WeergaveService } from 'leerling-account-modal';
import { AuthenticationService } from 'leerling-authentication';
import { BijlageComponent, HtmlContentComponent } from 'leerling-base';
import { AccessibilityService, VakToIconPipe, formatDateNL, windowOpen } from 'leerling-util';
import { AUTOMATISCH_BERICHT, SBoodschap, getPreviewInhoudBoodschap, kanReagerenOpBoodschap } from 'leerling/store';
import { toLazySignal } from 'ngxtension/to-lazy-signal';

import { BerichtOntvangerOptieComponent } from '../bericht-ontvanger-optie/bericht-ontvanger-optie.component';
import { stringToSpanWordsPipe } from './string-to-span-words.pipe';

@Component({
    selector: 'sl-bericht',
    imports: [
        CommonModule,
        AvatarComponent,
        IconPillComponent,
        PillComponent,
        ButtonComponent,
        VakToIconPipe,
        PillComponent,
        BerichtOntvangerOptieComponent,
        SpinnerComponent,
        stringToSpanWordsPipe,
        BijlageComponent,
        HtmlContentComponent,
        TagComponent
    ],
    providers: [provideIcons(IconBijlage, IconReply), provideVakIcons],
    templateUrl: './bericht.component.html',
    styleUrl: './bericht.component.scss',
    animations: [collapseAnimation()],
    host: {
        '[class.collapsable]': 'collapsable()',
        '(click)': 'collapseBericht()',
        'aria-live': 'assertive',
        '(window:keydown.escape)': 'popupService.closeAll()'
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BerichtComponent {
    authService = inject(AuthenticationService);
    popupService = inject(PopupService);
    router = inject(Router);
    deviceService = inject(DeviceService);
    accessibilityService = inject(AccessibilityService);
    private _weergaveService = inject(WeergaveService);

    automatischBericht = AUTOMATISCH_BERICHT;

    boodschap = input.required<SBoodschap>();
    hideBeantwoorden = input(false);
    hideOntvangers = input(false);

    collapsable = model(true);
    collapsed = signal(false);
    onMeerOntvangersPillClick = output<number>();

    verzenddatum = computed(() => formatDateNL(this.boodschap().verzendDatum, 'dag_uitgeschreven_dagnummer_maand_tijd'));

    verwijderIcon = viewChild.required('verwijderIcon', { read: ViewContainerRef });
    meerOntvangersPopup = viewChild.required('meerOntvangersPopup', { read: TemplateRef });
    meerOntvangersPill = viewChild.required('meerOntvangersPill', { read: ViewContainerRef });

    preview = computed(() => getPreviewInhoudBoodschap(this.boodschap().inhoud, { addEllipses: true }));
    inhoud = computed(() => (this.collapsed() ? this.preview() : (this._replaceNewLinesOnPlaintext(this.boodschap().inhoud) ?? '')));

    meerOntvangersPillText = computed(() =>
        this.boodschap().aantalExtraOntvangers > 0 ? '+' + this.boodschap().aantalExtraOntvangers + ' meer' : null
    );
    meerOntvangersPillAriaLabel = computed(() =>
        this.boodschap().aantalExtraOntvangers > 0 ? this.boodschap().aantalExtraOntvangers + ' meer ontvangers' : ''
    );

    huidigeLeerling = toLazySignal(this.authService.currentAccountLeerling$);
    avatarSrc = computed(() =>
        this.boodschap().verzondenDoorGebruiker &&
        this.authService.isCurrentContextLeerling &&
        !this._weergaveService.profielfotoVerbergen()
            ? this.huidigeLeerling()?.leerling?.avatarSrc
            : undefined
    );
    ariaLabelBerichtInfo = computed(() => this.getAriaLabelBerichtInfo());
    ariaLabelBerichtInhoud = computed(() => this.getAriaLabelBerichtInhoud());
    role = computed(() => (this.collapsable() ? 'button' : 'text'));
    showBeantwoorden = computed(() => kanReagerenOpBoodschap(this.boodschap()) && !this.hideBeantwoorden());

    constructor() {
        effect(() => {
            const canCollapse = this.collapsable() && this.preview() !== this.boodschap().inhoud;

            this.collapsable.set(canCollapse);
            this.collapsed.set(canCollapse);
        });
    }

    openBijlage(url: string) {
        windowOpen(url);
    }

    collapseBericht() {
        this.collapsed.set(this.collapsable() && !this.collapsed());
    }

    beantwoorden() {
        this.router.navigate([], { queryParams: { edit: this.boodschap().id }, queryParamsHandling: 'merge' });
    }

    openMeerOntvangersPopup() {
        this.onMeerOntvangersPillClick.emit(this.boodschap().id);
        if (!this.popupService.isOpen(this.meerOntvangersPill())) {
            const popupSettings = this.deviceService.isTabletOrDesktop()
                ? createPopupSettings({ alignment: 'start', width: '320px' })
                : createPopupSettings({ width: '320px', left: 16 });

            this.popupService.popup({ template: this.meerOntvangersPopup(), element: this.meerOntvangersPill(), settings: popupSettings });

            if (this.accessibilityService.isAccessedByKeyboard()) {
                setTimeout(() => this.accessibilityService.focusElementWithTabIndex(202));
            }
        }
    }
    private getAriaLabelBerichtInfo(): string {
        const verzender = this.boodschap().verzenderCorrespondent?.naam;
        let ontvangers = '';
        if (!this.hideOntvangers() && !this.boodschap().isSomtodayAutomatischBericht) {
            ontvangers =
                'Ontvanger:' +
                this.boodschap()
                    .ontvangerCorrespondenten.map((ontvanger) => ontvanger.naam)
                    .join(', ');
            if (this.accessibilityService.isScreenReaderMobileEnabled()) {
                this.onMeerOntvangersPillClick.emit(this.boodschap().id);
                ontvangers +=
                    ', ' +
                    this.boodschap()
                        .extraOntvangerCorrespondenten.map((ontvanger) => ontvanger.naam)
                        .join(', ');
            }
        }

        const datum = this.verzenddatum();
        const samengevouwen = this.collapsable() ? `Bericht is ${this.collapsed() ? 'samengevouwen' : 'uitgevouwen'}. ` : '';
        return `${samengevouwen}Datum: ${datum}. ${verzender ? `Verzender: ${verzender}. ` : ''} ${ontvangers}`;
    }

    private _replaceNewLinesOnPlaintext(input: string | undefined): string | undefined {
        // regex for detecting html content
        const htmlRegex = /<[^>]*>/g;
        if (!input || input.match(htmlRegex)) {
            return input;
        }
        return input.replace(/\n/g, '<br>');
    }

    private getAriaLabelBerichtInhoud(): string {
        return this.collapsed() ? '' : `Inhoud: ${stripHtml(this.boodschap().inhoud)} `;
    }
}
