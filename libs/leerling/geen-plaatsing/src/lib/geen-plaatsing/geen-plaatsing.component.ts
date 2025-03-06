import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from 'harmony';
import { GeenPlaatsingImageComponent } from './geen-plaatsing.image.component';

@Component({
    selector: 'sl-geen-plaatsing',
    imports: [CommonModule, ButtonComponent, GeenPlaatsingImageComponent],
    templateUrl: './geen-plaatsing.component.html',
    styleUrl: './geen-plaatsing.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeenPlaatsingComponent {
    private _router = inject(Router);

    uitloggen() {
        this._router.navigate(['/login'], { queryParams: { logout: true } });
    }
}
