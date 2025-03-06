import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2, ViewChild, inject } from '@angular/core';
import * as confetti from 'canvas-confetti';
import { CreateTypes } from 'canvas-confetti';
import { ButtonComponent, DeviceService, IconDirective, SpinnerComponent } from 'harmony';
import { IconDupliceren, IconName, IconNietZichtbaar, IconOntkoppelen, IconZichtbaar, provideIcons } from 'harmony-icons';
import { RLeerlingICalendarLink } from 'leerling-codegen';
import { InfoMessageService, windowOpen } from 'leerling-util';
import { Observable } from 'rxjs';
import { GeenAgendaGekoppeldComponent } from './geen-agenda-gekoppeld.component';
import { AgendaService } from './service/agenda.service';

@Component({
    selector: 'sl-agenda',
    imports: [CommonModule, GeenAgendaGekoppeldComponent, IconDirective, ButtonComponent, SpinnerComponent],
    templateUrl: './agenda.component.html',
    styleUrls: ['./agenda.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [provideIcons(IconDupliceren, IconOntkoppelen, IconNietZichtbaar, IconZichtbaar)]
})
export class AgendaComponent implements OnInit {
    @ViewChild('confettiButton', { read: ElementRef }) public _confettiButton: ElementRef;

    private _service = inject(AgendaService);
    private _deviceService = inject(DeviceService);
    private _clipboard = inject(Clipboard);
    private _infomessageService = inject(InfoMessageService);
    private _elementRef = inject(ElementRef);
    private _renderer = inject(Renderer2);
    private _confettiUnit: CreateTypes | undefined;
    private _lastConfettiStarted = 0;
    private _canvasEl: HTMLCanvasElement;

    public isAgendaGekoppeld = false;
    public showUrlToggle = false;
    public manualURL = 'https://somtoday-servicedesk.zendesk.com/hc/nl/articles/6925153339025';
    public hiddenLink = '•••••••••••••••••';
    public iCalURL$: Observable<RLeerlingICalendarLink>;
    public isTabletOrDesktop$ = this._deviceService.isTabletOrDesktop$;

    ngOnInit() {
        this.iCalURL$ = this._service.getICalendarLink();
    }

    public copyToClipboard(icalLink: string | undefined) {
        if (!icalLink) {
            return;
        }
        this._clipboard.copy(icalLink);
        this._infomessageService.dispatchSuccessMessage('Link gekopieerd naar klembord');
    }

    public removeIcalLink() {
        this._service.removeICalendarLink();
        this.changeView();
    }

    public changeView() {
        this.isAgendaGekoppeld = !this.isAgendaGekoppeld;
    }

    public openManual() {
        windowOpen(this.manualURL);
    }

    public shorten(leerlingICalendarLink: string | undefined) {
        if (!leerlingICalendarLink) {
            return leerlingICalendarLink;
        }
        const url = new URL(leerlingICalendarLink);
        return `${url.protocol}//${url.hostname}.....`;
    }

    public showToggle(): void {
        this.showUrlToggle = !this.showUrlToggle;
    }

    get iconNameForToggle(): IconName {
        return this.showUrlToggle ? 'nietZichtbaar' : 'zichtbaar';
    }

    get isPhoneOrTablet$(): Observable<boolean> {
        return this._deviceService.isPhoneOrTablet$;
    }

    magic(): void {
        // Bij inhouden enter-toets niet te veel confetti strooien.
        const now = new Date().getTime();
        if (now - this._lastConfettiStarted < 100) return;

        this._lastConfettiStarted = now;

        if (!this._confettiUnit || !this._canvasEl) {
            this._canvasEl = this._renderer.createElement('canvas');
            this._confettiUnit = confetti.create(this._canvasEl, {
                resize: true
            });
        }

        const boundingCLientRect = this._confettiButton.nativeElement.getBoundingClientRect();
        const centerButtonX = (boundingCLientRect.left + boundingCLientRect.right) / 2;
        const centerButtonY = (boundingCLientRect.top + boundingCLientRect.bottom) / 2;

        const newX = centerButtonX / window.innerWidth;
        const newY = centerButtonY / window.innerHeight;

        this._renderer.appendChild(document.body, this._canvasEl);
        this._confettiUnit({ origin: { x: newX, y: newY } })?.then(() => {
            this._renderer.removeChild(document.body, this._canvasEl);
        });
    }
}
