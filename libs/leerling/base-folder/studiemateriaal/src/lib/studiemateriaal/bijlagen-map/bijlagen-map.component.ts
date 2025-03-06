import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { collapseOnLeaveAnimation, expandOnEnterAnimation } from 'angular-animations';
import { IconDirective } from 'harmony';
import { IconChevronLinks, IconChevronOnder, IconMap, provideIcons } from 'harmony-icons';
import { BijlageComponent } from 'leerling-base';
import { JaarBijlage, JaarbijlageMap, Leermiddel } from '../../studiemateriaal-frontend-model';

export interface JaarbijlagemapOfLeermiddel {
    jaarbijlageMap?: JaarbijlageMap;
    leermiddelen?: Leermiddel[];
}

const ANIMATIONS = [expandOnEnterAnimation(), collapseOnLeaveAnimation()];

@Component({
    selector: 'sl-bijlagen-map',
    imports: [CommonModule, IconDirective, BijlageComponent],
    templateUrl: './bijlagen-map.component.html',
    styleUrl: './bijlagen-map.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: ANIMATIONS,
    providers: [provideIcons(IconMap, IconChevronOnder, IconChevronLinks)]
})
export class BijlagenMapComponent implements AfterViewInit {
    public jaarBijlageOfLeermiddel = input.required<JaarbijlagemapOfLeermiddel>();
    public isMapOpen = input<boolean>(false);

    public jaarbijlageMap = computed(() => this.jaarBijlageOfLeermiddel().jaarbijlageMap);
    public leermiddelen = computed(() => this.jaarBijlageOfLeermiddel().leermiddelen);
    public isOpen = signal(false);
    public mapnaam = computed(() => this.jaarbijlageMap()?.naam ?? 'Algemene leermiddelen');

    public bijlageOpened = output<JaarBijlage>();
    public leermiddelOpened = output<Leermiddel>();

    ngAfterViewInit(): void {
        if (this.isMapOpen()) {
            this.isOpen.set(true);
        }
    }

    public toggleOpen() {
        this.isOpen.set(!this.isOpen());
    }
}
