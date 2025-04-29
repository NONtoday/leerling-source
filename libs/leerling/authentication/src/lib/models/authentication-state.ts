import { Injectable } from '@angular/core';
import { GetResult, Preferences } from '@capacitor/preferences';
import { info, warn } from 'debugger';
import { isEqual } from 'lodash-es';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
    Affiliation,
    AuthenticationMetadata,
    SessionIdentifier,
    SomtodayAccountProfiel,
    SomtodayLeerling,
    SomtodayLeerlingIngelogdAccount
} from './authentication.models';

@Injectable({
    providedIn: 'root'
})
export class AuthenticationState {
    private static STORAGE_RECORD = 'SL_AUTH_CONFIG_RECORDS';

    private _authenticationMetaData$: BehaviorSubject<AuthenticationMetadata> = new BehaviorSubject<AuthenticationMetadata>({
        currentSessionIdentifier: undefined,
        allAuthenticationRecords: []
    });

    private get _metaData(): AuthenticationMetadata {
        return this._authenticationMetaData$.value;
    }

    public getCurrentSessionIdentifier(): SessionIdentifier | undefined {
        return this._metaData.currentSessionIdentifier;
    }

    public getAantalAccountProfielen(): number {
        return this._metaData.allAuthenticationRecords.length;
    }

    public getEersteAccountProfiel(): SomtodayAccountProfiel | undefined {
        return this.getAantalAccountProfielen() > 0 ? this._metaData.allAuthenticationRecords[0] : undefined;
    }

    public hasAnyAuthenticatedSession(): boolean {
        return this._metaData.allAuthenticationRecords.filter((metadata) => metadata.isAuthenticated).length > 0;
    }

    public findAccountProfiel(sessionIdentifier?: SessionIdentifier): SomtodayAccountProfiel | undefined {
        if (!sessionIdentifier) return undefined;

        return this._metaData.allAuthenticationRecords.find((profiel) => isEqual(profiel.sessionIdentifier, sessionIdentifier));
    }

    public hoortLeerlingBijAccount(sessionIdentifier: SessionIdentifier, leerling: SomtodayLeerling): boolean {
        return (
            this.findAccountProfiel(sessionIdentifier)
                ?.subLeerlingen.map((ll) => ll.id)
                .includes(leerling.id) || false
        );
    }

    public getCurrentLeerling(): SomtodayLeerling | undefined {
        return this._metaData.currentLeerling;
    }

    private _metadataString(): string {
        return (
            this._metaData.currentSessionIdentifier?.UUID +
            ' - ' +
            this._metaData.currentLeerling?.initialen +
            '(' +
            this._metaData.currentLeerling?.id +
            ')' +
            ' - ' +
            this._metaData.allAuthenticationRecords.length
        );
    }

    public async updateMetadata(metadataFields: Partial<AuthenticationMetadata>) {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-base-to-string
        info('Update Metadata - ' + metadataFields);
        info('Oude metadata:' + this._metadataString());
        const newMetaData = { ...this._metaData, ...metadataFields };
        this._authenticationMetaData$.next(newMetaData);
        info('Nieuwe metadata:' + this._metadataString());
        await this._saveMetadata();
    }

    public async updateCurrentAccountProfielAndRemoveDuplicates(profielFields: Partial<SomtodayAccountProfiel>) {
        const profielen = this._metaData.allAuthenticationRecords;
        const authRecordIndex = profielen.findIndex((profiel) => isEqual(profiel.sessionIdentifier, this.getCurrentSessionIdentifier()));
        if (authRecordIndex < 0) throw Error('Geen huidig account-profiel gevonden');

        // werk het profiel bij
        const updatedProfiel = { ...profielen[authRecordIndex], ...profielFields };
        profielen[authRecordIndex] = updatedProfiel;
        await this.updateMetadata({ allAuthenticationRecords: profielen });

        await this._removeDuplicates(updatedProfiel);
    }

    public async setCurrentLeerling(leerling: SomtodayLeerling) {
        await this.updateMetadata({ currentLeerling: leerling });
    }

    private async _removeDuplicates(profiel: SomtodayAccountProfiel): Promise<void> {
        let allAuthenticationRecords = this._metaData.allAuthenticationRecords;
        const currentSize = allAuthenticationRecords.length;

        allAuthenticationRecords = allAuthenticationRecords.filter(
            (value) =>
                isEqual(profiel.sessionIdentifier, value.sessionIdentifier) || // huidig profiel mag gelijke account details hebben
                profiel.accountUUID !== value.accountUUID ||
                // onderstaande is enkel om de context te removen en dient dus altijd false te returnen
                // de promise is altijd beschikbaar, dus kan inverted worden voor gewenst resultaat.
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                !this._removeSessionFromStorage(value.sessionIdentifier)
        );

        if (allAuthenticationRecords.length < currentSize) {
            await this.updateMetadata({ allAuthenticationRecords: allAuthenticationRecords });
        }
    }

    public async removeAccountProfiel(teVerwijderenProfiel: SomtodayAccountProfiel): Promise<void> {
        const filteredAuthenticationRecords = this._metaData.allAuthenticationRecords.filter(
            (bestaandProfiel) => bestaandProfiel !== teVerwijderenProfiel
        );

        let sessionIdentifier = this.getCurrentSessionIdentifier();
        let leerling = this.getCurrentLeerling();
        if (isEqual(teVerwijderenProfiel.sessionIdentifier, sessionIdentifier)) {
            sessionIdentifier = undefined;
            leerling = undefined;
        }
        await this.updateMetadata({
            allAuthenticationRecords: filteredAuthenticationRecords,
            currentSessionIdentifier: sessionIdentifier,
            currentLeerling: leerling
        });
        await this._removeSessionFromStorage(teVerwijderenProfiel.sessionIdentifier);
        info('Start sanitizing CapacitorPreferences');
        this.sanitizeStorageAPI().then(() => info('Sanitizing done'));
    }

    public async generatedBaseContext(): Promise<SessionIdentifier> {
        info('generatedBaseContext');
        const newBaseContext = {
            sessionIdentifier: this._generateNewSessionIdentifier(),
            isAuthenticated: false,
            subLeerlingen: []
        };

        const allAuthenticationRecords = this._metaData.allAuthenticationRecords;
        allAuthenticationRecords.push(newBaseContext);

        await this.updateMetadata({ allAuthenticationRecords: allAuthenticationRecords });
        return newBaseContext.sessionIdentifier;
    }

    public findCurrentAccountProfielOrError(): SomtodayAccountProfiel {
        const profiel = this.findAccountProfiel(this.getCurrentSessionIdentifier());

        if (!profiel) throw Error('Geen huidig account-profiel gevonden');
        return profiel;
    }

    public async purge(): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this._metaData.allAuthenticationRecords.forEach((record) => this._removeSessionFromStorage(record.sessionIdentifier));
        await this.updateMetadata({ currentLeerling: undefined, currentSessionIdentifier: undefined, allAuthenticationRecords: [] });
        await this.sanitizeStorageAPI();
    }

    private _generateNewSessionIdentifier(): SessionIdentifier {
        return {
            UUID: uuidv4()
        };
    }

    /**************************************************************************************************************************************************/
    /*                                                                    Storage                                                                     */
    /**************************************************************************************************************************************************/
    private async _saveMetadata(): Promise<void> {
        return Preferences.set({ key: AuthenticationState.STORAGE_RECORD, value: JSON.stringify(this._metaData) });
    }

    public async loadMetadata(): Promise<boolean> {
        const { value } = await Preferences.get({ key: AuthenticationState.STORAGE_RECORD });
        warn(`${value ? value : 'Geen opgeslagen IDP metadata.'}`);

        if (!value) return false;

        const metadata: AuthenticationMetadata = JSON.parse(value) as AuthenticationMetadata;
        if (metadata && metadata.allAuthenticationRecords.length >= 1 && metadata.currentSessionIdentifier) {
            this.updateMetadata(metadata);
            return true;
        } else {
            info('Load Metadata - We hebben geen auth-records');
            return false;
        }
    }

    public async reloadSessionIdFromStorage(): Promise<SessionIdentifier | undefined> {
        const { value } = await Preferences.get({ key: AuthenticationState.STORAGE_RECORD });
        warn(`${value ? value : 'Geen opgeslagen IDP metadata.'}`);

        if (!value) return undefined;

        const metadata: AuthenticationMetadata = JSON.parse(value) as AuthenticationMetadata;
        if (metadata && metadata.allAuthenticationRecords.length >= 1 && metadata.currentSessionIdentifier)
            return metadata.currentSessionIdentifier;
        return undefined;
    }

    public async loadSessionFromStorage(sessionIdentifier: SessionIdentifier): Promise<string> {
        const { value }: GetResult = await Preferences.get({ key: sessionIdentifier.UUID });
        return value ?? '{}';
    }

    public async saveCurrentSessionToStorage(usedStorageBackup: string, resetIdentifier = false): Promise<void> {
        const sessionIdentifier = resetIdentifier ? this._generateNewSessionIdentifier() : this.getCurrentSessionIdentifier();
        if (!sessionIdentifier) return;

        return Preferences.set({ key: sessionIdentifier.UUID, value: usedStorageBackup });
    }

    private async _removeSessionFromStorage(sessionIdentifier: SessionIdentifier): Promise<void> {
        return Preferences.remove({ key: sessionIdentifier.UUID });
    }

    /**************************************************************************************************************************************************/
    /*                                                             Exposed observables                                                                */
    /**************************************************************************************************************************************************/
    public get beschikbareProfielen$(): Observable<SomtodayAccountProfiel[]> {
        return this._authenticationMetaData$.asObservable().pipe(map((metadata) => metadata.allAuthenticationRecords));
    }

    public get beschikbareSessionIdentifiers() {
        return this.metadata.allAuthenticationRecords.map((record) => record.sessionIdentifier.UUID);
    }

    public get currentProfiel$(): Observable<SomtodayAccountProfiel | undefined> {
        return this.beschikbareProfielen$.pipe(
            map((profiles) => profiles.find((value) => isEqual(value.sessionIdentifier, this.getCurrentSessionIdentifier())))
        );
    }

    public get currentAffiliation$(): Observable<Affiliation | undefined> {
        return this.currentProfiel$.pipe(map((profile: SomtodayAccountProfiel) => profile?.affiliation));
    }

    public async sanitizeStorageAPI(): Promise<void> {
        const keys = await Preferences.keys();
        const knownSessionIdentifiers: string[] = this._metaData.allAuthenticationRecords.map((profile) =>
            profile.sessionIdentifier?.UUID.toLowerCase()
        );
        for (const possibleSessionIdentifier of keys.keys) {
            if (this._isValidUUID(possibleSessionIdentifier)) {
                const foundRecord = knownSessionIdentifiers.find((uuid) => uuid?.toLowerCase() === possibleSessionIdentifier);
                if (!foundRecord) {
                    await Preferences.remove({ key: possibleSessionIdentifier });
                    info('Removing old session: ' + possibleSessionIdentifier);
                }
            }
        }
    }

    private _isValidUUID(possibleUuid: string) {
        const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        return regex.test(possibleUuid);
    }

    get isCurrentContextLoggedIn$(): Observable<boolean> {
        return this.currentProfiel$.pipe(map((profile) => !!profile && profile.isAuthenticated));
    }

    get isCurrentContextLoggedIn(): boolean {
        return (
            this._metaData.allAuthenticationRecords.find((profiel) =>
                isEqual(profiel.sessionIdentifier, this.getCurrentSessionIdentifier())
            )?.isAuthenticated ?? false
        );
    }

    get metadata(): AuthenticationMetadata {
        return this._metaData;
    }

    get currentAccountLeerling$(): Observable<SomtodayLeerlingIngelogdAccount> {
        return this._authenticationMetaData$.asObservable().pipe(
            map((metadata) => {
                return {
                    leerling: metadata.currentLeerling,
                    sessionIdentifier: metadata.currentSessionIdentifier,
                    accountUUID: metadata.allAuthenticationRecords.find((profiel) =>
                        isEqual(profiel.sessionIdentifier, metadata.currentSessionIdentifier)
                    )?.accountUUID
                };
            })
        );
    }
}
