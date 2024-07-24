import { OAuthStorage } from 'angular-oauth2-oidc';

export class InMemoryStorage extends OAuthStorage {
    private storage: { [key: string]: string } = {};

    get length(): number {
        return Object.keys(this.storage).length;
    }

    clear(): void {
        this.storage = {};
    }

    getItem(key: string): string | null {
        return this.storage[key] || null;
    }

    key(index: number): string | null {
        const keys = Object.keys(this.storage);
        return index >= 0 && index < keys.length ? keys[index] : null;
    }

    removeItem(key: string): void {
        delete this.storage[key];
    }

    setItem(key: string, value: string): void {
        this.storage[key] = value;
    }

    backup(): string {
        return JSON.stringify(this.storage);
    }

    restore(serializedContent: string): void {
        this.storage = JSON.parse(serializedContent);
    }
}
