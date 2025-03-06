import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SOMTODAY_API_CONFIG } from '@shared/utils/somtoday-api-token';
import { ButtonComponent, CssVarPipe, IconDirective, SpinnerComponent } from 'harmony';
import { IconHart, IconSomtoday, provideIcons } from 'harmony-icons';
import { ApiConfiguration } from 'leerling-codegen';
import { DeploymentConfiguration, environment } from 'leerling-environment';
import { InfoMessageService, isWeb, removeAuthRequestedUrl } from 'leerling-util';
import { AuthenticationContextReplacedEvent } from '../models/authentication.models';
import { AuthenticationService } from '../services/authentication.service';
import {
    BACKGROUND_ANIMATION,
    BackgroundAnimationState,
    BOTTOM_ANIMATION,
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
    animations: ANIMATIONS,
    providers: [provideIcons(IconSomtoday, IconHart)]
})
export class LoginComponent implements OnInit {
    image = viewChild.required('image', { read: ElementRef });

    private _somtodayApiConfig = inject(SOMTODAY_API_CONFIG);
    private _router = inject(Router);
    private _activatedRoute = inject(ActivatedRoute);
    private _authenticationService = inject(AuthenticationService);
    private _infoMessageService = inject(InfoMessageService);
    private _apiConfiguration = inject(ApiConfiguration);
    private _superSecretClickCounter = -5;
    private _changeDetectorRef = inject(ChangeDetectorRef);

    public backgroundAnimationState: BackgroundAnimationState = 'cover';
    public titleAnimationState: TitleAnimationState = 'default';
    public imageAnimationState: ImageAnimationState = 'default';
    public bottomAnimationState: BottomAnimationState = 'default';

    private static PRIVATE_IP_REGEX =
        /^(127(?:\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}:8080$)|(10(?:\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}:8080$)|(192\.168(?:\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){2}:8080$)|(172\.(?:1[6-9]|2\d|3[0-1])(?:\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){2}:8080$)/;

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
                removeAuthRequestedUrl();
                if (message) {
                    this._infoMessageService.dispatchInfoMessage(message);
                    this._router.navigate(['/']);
                }
            });
        } else {
            this._authenticationService.isLoggedIn.then(() => {
                if (this.skipWelcomeMessage) {
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
            if (config === DeploymentConfiguration.ontwikkel) {
                if (!this.isPrivateIpRange(this.customIridiumBackend)) {
                    this.selectedConfig = undefined;
                    this.customIridiumBackend = '';
                }
            }
            if (config !== DeploymentConfiguration.ontwikkel || !this.customIridiumBackend) {
                environment.setIridiumTo(config, this.prNumberFromString(config, this.customPRNumber));
            } else {
                environment.setIridiumTo(config, undefined, this.customIridiumBackend);
            }
            this._apiConfiguration.rootUrl = environment.apiUrl;
            this._somtodayApiConfig.apiUrl = environment.apiUrl;
            await this._authenticationService.purge();
        }
        await this._authenticationService.removeCurrentContext(new AuthenticationContextReplacedEvent());
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
        const inputValue = inputEventTarget?.value;
        this.customIridiumBackend = inputValue;
        this.selectedConfig = DeploymentConfiguration.ontwikkel;
    }

    isPrivateIpRange(inputValue: string) {
        return LoginComponent.PRIVATE_IP_REGEX.test(inputValue);
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
