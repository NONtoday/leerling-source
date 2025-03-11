import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent, CssVarPipe, IconDirective, SpinnerComponent } from 'harmony';
import { IconHart, IconSomtoday, provideIcons } from 'harmony-icons';
import { ApiConfiguration } from 'leerling-codegen';
import { DeploymentConfiguration, environment } from 'leerling-environment';
import { RequestService } from 'leerling-request';
import { InfoMessageService, isWeb } from 'leerling-util';
import { AuthenticationService } from '../services/authentication.service';
import {
    BACKGROUND_ANIMATION,
    BOTTOM_ANIMATION,
    BackgroundAnimationState,
    BottomAnimationState,
    IMAGE_ANIMATION,
    ImageAnimationState,
    TITLE_ANIMATION,
    TitleAnimationState
} from './animation';

const ANIMATIONS = [TITLE_ANIMATION, IMAGE_ANIMATION, BOTTOM_ANIMATION, BACKGROUND_ANIMATION];

@Component({
    selector: 'sl-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    imports: [CommonModule, IconDirective, ButtonComponent, SpinnerComponent, CssVarPipe],
    standalone: true,
    animations: ANIMATIONS,
    providers: [provideIcons(IconSomtoday, IconHart)]
})
export class LoginComponent implements OnInit {
    image = viewChild.required('image', { read: ElementRef });

    private _router = inject(Router);
    private _activatedRoute = inject(ActivatedRoute);
    private _authenticationService = inject(AuthenticationService);
    private _infoMessageService = inject(InfoMessageService);
    private _apiConfiguration = inject(ApiConfiguration);
    private _superSecretClickCounter = -5;
    private _requestService = inject(RequestService);
    private _changeDetectorRef = inject(ChangeDetectorRef);

    public backgroundAnimationState: BackgroundAnimationState = 'cover';
    public titleAnimationState: TitleAnimationState = 'default';
    public imageAnimationState: ImageAnimationState = 'default';
    public bottomAnimationState: BottomAnimationState = 'default';

    environmentSelectionVisible = false;

    options: string[] = [
        'nightly',
        'productie',
        'test',
        'acceptatie',
        'ontwikkel',
        'inkijk',
        'inkijk2',
        'demo',
        'regressie',
        'regressie-release',
        'pr'
    ];
    selectedConfig: string | undefined;
    customPRNumber = '';
    customIridiumBackend = '';

    public skipWelcomeMessage = isWeb() && !this._activatedRoute.snapshot.queryParams['splash'];
    public debugmode = false;
    public logout = this._activatedRoute.snapshot.queryParams['logout'] === 'true';
    private _isAnimating = signal(false);

    ngOnInit() {
        if (!this.skipWelcomeMessage) this.startAnimation();
        if (this.logout) {
            this._authenticationService.logoffAndRemove().then((message) => {
                if (message) {
                    this._infoMessageService.dispatchInfoMessage(message);
                    this._router.navigate(['/']);
                }
            });
        } else {
            this._authenticationService.isLoggedIn.then((isLoggedIn) => {
                if (isLoggedIn) {
                    this._router.navigate([]);
                } else if (this.skipWelcomeMessage) {
                    this.startLoginFlow();
                }
            });
        }
    }

    public startAnimation() {
        setTimeout(() => {
            this.setAnimation(true);
            this.backgroundAnimationState = 'shrink-slide-up';
            this.titleAnimationState = 'slide-up';
            this._changeDetectorRef.detectChanges();
        }, 500);
    }

    async startLoginFlow() {
        if (this.selectedConfig) {
            const config: DeploymentConfiguration = this.selectedConfig as DeploymentConfiguration;
            if (config !== DeploymentConfiguration.ontwikkel || !this.customIridiumBackend) {
                environment.setIridiumTo(config, this.prNumberFromString(config, this.customPRNumber));
            } else {
                environment.setIridiumTo(config, undefined, this.customIridiumBackend);
            }
            this._apiConfiguration.rootUrl = environment.apiUrl;
            this._requestService.rootUrl = environment.apiUrl;
            await this._authenticationService.purge();
        }
        this._authenticationService.startLoginFlowOnCurrentContext();
    }

    prNumberFromString(config: DeploymentConfiguration, inputString: string): number | undefined {
        if (!inputString || config !== DeploymentConfiguration.pr) {
            return undefined;
        }
        return parseInt(inputString, 10);
    }

    count() {
        this._superSecretClickCounter++;
        if (this._superSecretClickCounter === 0) {
            this._superSecretClickCounter = -5;
            this.environmentSelectionVisible = true;
        }
    }

    onOptionSelected(option: string) {
        this.selectedConfig = option;
    }

    onCustomOptionSelected(event: EventTarget | null) {
        const inputEventTarget = event as HTMLInputElement;
        this.customPRNumber = inputEventTarget?.value;
        this.selectedConfig = DeploymentConfiguration.pr;
    }

    onCustomIridiumEndpoint(event: EventTarget | null) {
        const inputEventTarget = event as HTMLInputElement;
        this.customIridiumBackend = inputEventTarget?.value;
        this.selectedConfig = DeploymentConfiguration.ontwikkel;
    }

    flipDebugMode() {
        this.debugmode = !this.debugmode;
        environment.setDebug(this.debugmode);
    }

    public setAnimation(value: boolean) {
        this._isAnimating.set(value);
    }

    public onTitleAnimationDone() {
        if (this.titleAnimationState === 'slide-up') {
            this.imageAnimationState = 'fade-slide-up';
        }
    }

    public onImageAnimationDone() {
        if (this.imageAnimationState === 'fade-slide-up') {
            this.bottomAnimationState = 'fade-slide-up';
        }
    }
}
