import { Browser } from '@capacitor/browser';
import { isIOS } from './platform/platform';

const REQUESTED_URL = 'requestedAuthUrl';
const INITIAL_URL = 'initialUrl';
const OAUTH_URL_PART = 'oauth';

export function windowOpen(url: string) {
    if (isIOS()) {
        Browser.open({ url: url }).catch(() => window.open(url, '_blank'));
    } else {
        window.open(url, '_blank');
    }
}

export function setHref(url: string) {
    if (isIOS()) {
        Browser.open({ url: url }).catch(() => (window.location.href = url));
    } else {
        window.location.href = url;
    }
}

export function removeAuthRequestedUrl(): void {
    sessionStorage.removeItem(REQUESTED_URL);
}

export function getRequestedUrl(): string | null {
    const url = sessionStorage.getItem(REQUESTED_URL);
    return url;
}

export function storeAuthRequestedUrl() {
    storeCurrentUrl(REQUESTED_URL);
}

export function storeInitialUrl() {
    storeCurrentUrl(INITIAL_URL);
}

function storeCurrentUrl(key: string) {
    const currentUrl = getCurrentUrl();
    if (currentUrl.indexOf(OAUTH_URL_PART) === -1 && currentUrl !== '/' && currentUrl.indexOf('login') === -1) {
        sessionStorage.setItem(key, currentUrl);
    }
}

export function isCurrentUrlInitialUrl(): boolean {
    const initialUrl = sessionStorage.getItem(INITIAL_URL);
    return initialUrl === getCurrentUrl();
}

function getCurrentUrl(): string {
    return location.pathname + location.search;
}
