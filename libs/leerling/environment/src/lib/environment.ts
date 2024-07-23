// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { Capacitor } from '@capacitor/core';
import { setLoggingEnabled } from 'debugger';

enum SupportedPlatforms {
    WEB = 'web',
    IOS = 'ios',
    ANDROID = 'android'
}

export enum DeploymentConfiguration {
    productie = 'productie',
    test = 'test',
    acceptatie = 'acceptatie',
    nightly = 'nightly', //build
    ontwikkel = 'ontwikkel', //localhost
    pr = 'pr', //build
    inkijk = 'inkijk',
    inkijk2 = 'inkijk2',
    demo = 'demo',
    regressie = 'regressie', //build
    regressieRelease = 'regressie-release' //build
}

export const STORAGE_KEY_IRIDIUM_CONFIG = 'sll-iridium-config';
export const STORAGE_KEY_CONFIG = 'sll-config';
export const STORAGE_KEY_IRIDIUM_BACKEND = 'sll-iridium-backend';
export const STORAGE_KEY_IRIDIUM_PR = 'sll-iridium-pr';

class Environment {
    LOCALHOST_REGEX = /^(localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
    PRIVATE_IP_REGEX = /^((192|172)\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
    SOMTODAY_TLD_NON_PROD_REGEX = /^leerling\.([^.]+)\.somtoday\.(nl|build)$/;
    PR_NUMBER_REGEX = /^pr-([0-9]+)$/;

    iridiumDeploymentConfig: DeploymentConfiguration | undefined;
    localDeploymentConfig: DeploymentConfiguration | undefined;
    iridiumLocalBackendOverride: string | undefined;
    leerlingPRVersion: number | undefined;
    iridiumIridiumPRVersion: number | undefined;
    debugModeThisSession: boolean = JSON.parse(localStorage.getItem('sll-debugmode') || 'false');

    buildConfigs: DeploymentConfiguration[] = [
        DeploymentConfiguration.pr,
        DeploymentConfiguration.nightly,
        DeploymentConfiguration.regressie,
        DeploymentConfiguration.regressieRelease
    ];

    nativePlatforms: SupportedPlatforms[] = [SupportedPlatforms.IOS, SupportedPlatforms.ANDROID];

    private _iridiumPostfixForConfig(config: DeploymentConfiguration | undefined) {
        if (config === DeploymentConfiguration.ontwikkel) {
            return this.iridiumLocalBackendOverride ? this.iridiumLocalBackendOverride : window.location.hostname + ':8080';
        }
        if (config === DeploymentConfiguration.pr) {
            if (this.iridiumIridiumPRVersion) return `pr-${this.iridiumIridiumPRVersion}.somtoday.build`;
            config = DeploymentConfiguration.nightly;
        }

        const isBuildTld = config ? this.buildConfigs.includes(config) : false;
        return `${DeploymentConfiguration.productie === config ? '' : config + '.'}somtoday.${isBuildTld ? 'build' : 'nl'}`;
    }

    private findSettingOrProduction(): DeploymentConfiguration {
        if (this.localDeploymentConfig) return this.localDeploymentConfig;
        this.iridiumDeploymentConfig = localStorage.getItem(STORAGE_KEY_IRIDIUM_CONFIG) as DeploymentConfiguration;
        this.localDeploymentConfig = localStorage.getItem(STORAGE_KEY_CONFIG) as DeploymentConfiguration;
        this.iridiumLocalBackendOverride = localStorage.getItem(STORAGE_KEY_IRIDIUM_BACKEND) || undefined;
        const iridiumPRNumber = localStorage.getItem(STORAGE_KEY_IRIDIUM_PR);
        if (iridiumPRNumber) this.iridiumIridiumPRVersion = parseInt(iridiumPRNumber, 10);
        if (this.iridiumDeploymentConfig && this.localDeploymentConfig) return this.localDeploymentConfig;

        if (this.isNative) {
            if (!this.localDeploymentConfig) {
                this.localDeploymentConfig = DeploymentConfiguration.productie;
            }
        } else {
            this.localDeploymentConfig = this.environmentByWindowLocation();
        }
        this.iridiumDeploymentConfig = this.localDeploymentConfig;
        localStorage.setItem(STORAGE_KEY_IRIDIUM_CONFIG, this.iridiumDeploymentConfig);
        localStorage.setItem(STORAGE_KEY_CONFIG, this.localDeploymentConfig);
        return this.localDeploymentConfig;
    }

    private environmentByWindowLocation(): DeploymentConfiguration {
        const currentDomain = window.location.hostname;
        if (this.LOCALHOST_REGEX.test(currentDomain) || this.PRIVATE_IP_REGEX.test(currentDomain)) {
            return DeploymentConfiguration.ontwikkel;
        }
        const matches = this.SOMTODAY_TLD_NON_PROD_REGEX.exec(currentDomain);
        if (!matches) {
            return DeploymentConfiguration.productie;
        }

        const subDomain: string = matches[1];
        switch (subDomain) {
            case 'inkijk':
                return DeploymentConfiguration.inkijk;
            case 'inkijk2':
                return DeploymentConfiguration.inkijk2;
            case 'test':
                return DeploymentConfiguration.test;
            case 'acceptatie':
                return DeploymentConfiguration.acceptatie;
            case 'nightly':
                return DeploymentConfiguration.nightly;
            case 'demo':
                return DeploymentConfiguration.demo;
            case 'regressie':
                return DeploymentConfiguration.regressie;
            case 'regressie-release':
                return DeploymentConfiguration.regressieRelease;
            default:
                this.leerlingPRVersion = parseInt((this.PR_NUMBER_REGEX.exec(subDomain) || [])[1]);
                return DeploymentConfiguration.pr;
        }
    }

    public clear() {
        localStorage.removeItem(STORAGE_KEY_CONFIG);
        localStorage.removeItem(STORAGE_KEY_IRIDIUM_BACKEND);
        localStorage.removeItem(STORAGE_KEY_IRIDIUM_CONFIG);
        localStorage.removeItem(STORAGE_KEY_IRIDIUM_PR);

        this.iridiumDeploymentConfig = undefined;
        this.localDeploymentConfig = undefined;
        this.iridiumLocalBackendOverride = undefined;
        this.leerlingPRVersion = undefined;
        this.iridiumIridiumPRVersion = undefined;
        this.debugModeThisSession = false;
    }

    get idpIssuer() {
        if (!this.iridiumDeploymentConfig) this.findSettingOrProduction();
        return `${
            this.iridiumDeploymentConfig !== DeploymentConfiguration.ontwikkel ? 'https://inloggen.' : 'http://'
        }${this._iridiumPostfixForConfig(this.iridiumDeploymentConfig)}`;
    }

    get apiUrl() {
        if (!this.iridiumDeploymentConfig) this.findSettingOrProduction();
        return `${
            this.iridiumDeploymentConfig !== DeploymentConfiguration.ontwikkel ? 'https://api.' : 'http://'
        }${this._iridiumPostfixForConfig(this.iridiumDeploymentConfig)}/rest/v1`;
    }

    get config() {
        return this.findSettingOrProduction();
    }

    get iridiumConfig(): DeploymentConfiguration | undefined {
        return this.iridiumDeploymentConfig;
    }

    get production() {
        return this.config === DeploymentConfiguration.productie;
    }

    get isNative(): boolean {
        const currentPlatform: SupportedPlatforms = Capacitor.getPlatform() as SupportedPlatforms;
        return this.nativePlatforms.includes(currentPlatform);
    }

    get idpClientId(): string {
        return this.isNative ? 'somtoday-leerling-native' : 'somtoday-leerling-web';
    }

    get idpRedirectUri() {
        return `${this.ownBaseUri}/oauth/callback`;
    }

    get ownBaseUri() {
        if (this.isNative) {
            return 'somtoday://nl.topicus.somtoday.leerling';
        }
        const config = this.findSettingOrProduction();
        if (DeploymentConfiguration.ontwikkel === config) return 'http://' + window.location.hostname + ':4242';
        if (DeploymentConfiguration.pr === config) return `https://leerling.pr-${this.leerlingPRVersion}.somtoday.build`;
        const isBuildTld = this.buildConfigs.includes(config);
        return `https://leerling.${config === DeploymentConfiguration.productie ? '' : config + '.'}somtoday.${
            isBuildTld ? 'build' : 'nl'
        }`;
    }

    get leerlingBaseUriForCurrentIridiumConfig() {
        const iridiumConfig = this.iridiumDeploymentConfig || this.findSettingOrProduction();
        if (DeploymentConfiguration.ontwikkel === iridiumConfig)
            return 'http://' + this._replace8080with4242port(this.iridiumLocalBackendOverride || window.location.hostname + ':8080');
        if (DeploymentConfiguration.pr === iridiumConfig) return `https://leerling.pr-${this.leerlingPRVersion}.somtoday.build`;
        const isBuildTld = this.buildConfigs.includes(iridiumConfig);
        return `https://leerling.${iridiumConfig === DeploymentConfiguration.productie ? '' : iridiumConfig + '.'}somtoday.${
            isBuildTld ? 'build' : 'nl'
        }`;
    }

    private _replace8080with4242port(url: string): string {
        return url.replace(/:8080$/, ':4242');
    }

    setIridiumTo(connectToConfig: DeploymentConfiguration, prNumber?: number, customIridiumBackend?: string) {
        this.iridiumIridiumPRVersion = prNumber;
        this.iridiumDeploymentConfig = connectToConfig;
        this.iridiumLocalBackendOverride = customIridiumBackend;
        localStorage.setItem(STORAGE_KEY_IRIDIUM_CONFIG, connectToConfig);
        if (prNumber) localStorage.setItem(STORAGE_KEY_IRIDIUM_PR, prNumber.toString());
        else localStorage.removeItem(STORAGE_KEY_IRIDIUM_PR);
        if (customIridiumBackend) localStorage.setItem(STORAGE_KEY_IRIDIUM_BACKEND, customIridiumBackend);
        else localStorage.removeItem(STORAGE_KEY_IRIDIUM_BACKEND);
    }

    setDebug(debug: boolean) {
        this.debugModeThisSession = debug;
        setLoggingEnabled(debug);
        localStorage.setItem('sll-debugmode', JSON.stringify(debug));
    }
}

export const environment = new Environment();

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
