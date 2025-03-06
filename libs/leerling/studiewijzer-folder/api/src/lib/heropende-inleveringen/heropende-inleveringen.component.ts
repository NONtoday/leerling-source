import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { BijlageComponent } from '@shared/uploadfile/ui';
import { collapseOnLeaveAnimation, expandOnEnterAnimation } from 'angular-animations';
import { IconDirective, PillComponent } from 'harmony';
import { IconChevronLinks, provideIcons } from 'harmony-icons';
import { SlDatePipe, windowOpen } from 'leerling-util';
import { InleveringOndertitelPipe } from '../inlevering/inlevering-ondertitel.pipe';
import { HeropendMoment } from '../studiewijzer-item-inleveringen/studiewijzer-item-inleveringen.component';

const ANIMATIONS = [collapseOnLeaveAnimation(), expandOnEnterAnimation()];

@Component({
    selector: 'sl-heropende-inleveringen',
    imports: [CommonModule, PillComponent, IconDirective, BijlageComponent, SlDatePipe, InleveringOndertitelPipe],
    templateUrl: './heropende-inleveringen.component.html',
    styleUrl: './heropende-inleveringen.component.scss',
    animations: ANIMATIONS,
    providers: provideIcons(IconChevronLinks),
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeropendeInleveringenComponent {
    public moment = input.required<HeropendMoment>();

    public toonInleveringen = signal(false);

    public toggleInleveringen() {
        this.toonInleveringen.set(!this.toonInleveringen());
    }

    public openUrl(url: string | undefined) {
        if (url) windowOpen(url);
    }
}
