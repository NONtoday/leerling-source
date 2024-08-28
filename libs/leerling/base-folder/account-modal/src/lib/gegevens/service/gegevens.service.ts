import { Injectable, inject, untracked } from '@angular/core';
import { Store } from '@ngxs/store';
import { format, parseISO } from 'date-fns';
import { RAccount, RAdres, REloRestricties, RLeerling, RVerzorger } from 'leerling-codegen';
import { RequestInformationBuilder, RequestService } from 'leerling-request';
import { PlaatsingSelectors, RefreshSchoolgegevens, SLeerlingSchoolgegevens, SharedSelectors } from 'leerling/store';
import { Observable, Subject, firstValueFrom } from 'rxjs';

export interface AccountModel {
    gebruikersnaam: string;
    naam: string;
    wachtwoordWijzigenAan: boolean;
    emailWijzigenAan: boolean;
    mobielWijzigenAan: boolean;
    leerlingnummer?: number | string;
    geboortedatum?: string;
    buitenland1?: string;
    buitenland2?: string;
    buitenland3?: string;
    straatnaam?: string;
    huisnummer?: string;
    postcode?: string;
    woonplaats?: string;
    land?: string;
    telnummer?: string;
    mobielnummer?: string;
    werknummer?: string;
    eMail?: string;
}

@Injectable({
    providedIn: 'root'
})
export class GegevensService {
    private _accountModel$: Subject<AccountModel> = new Subject<AccountModel>();
    private _requestService = inject(RequestService);
    private _store = inject(Store);

    public getCurrentAccount$(): Subject<AccountModel> {
        this.refreshCurrentAccountGegevens();
        return this._accountModel$;
    }

    public getAccountGegevens$(): Observable<RAccount> {
        return this._requestService.get<RAccount>(
            'account/me',
            new RequestInformationBuilder().additionals('adres', 'restricties').build()
        );
    }

    public getSchoolgegevens$(): Observable<SLeerlingSchoolgegevens | undefined> {
        untracked(() => this._store.dispatch(new RefreshSchoolgegevens()));
        return this._store.select(PlaatsingSelectors.getSchoolgegevens());
    }

    public async updateContactGegevensVerzorger(mobielnummer: string, werknummer: string, email: string): Promise<void> {
        const body = {
            mobielNummer: mobielnummer || null,
            mobielWerkNummer: werknummer || null,
            email: email || null
        } as RVerzorger;

        await firstValueFrom(this._requestService.put('verzorgers/contactgegevens', new RequestInformationBuilder().body(body).build()));

        await this.refreshCurrentAccountGegevens();
    }

    public async updateContactGegevensLeerling(mobielnummer: string, email: string): Promise<void> {
        const body = {
            mobielNummer: mobielnummer || null,
            email: email || null
        } as RLeerling;

        await firstValueFrom(this._requestService.put('leerlingen/contactgegevens', new RequestInformationBuilder().body(body).build()));
        await this.refreshCurrentAccountGegevens();
    }

    public async refreshCurrentAccountGegevens(): Promise<void> {
        if (this._store.selectSnapshot(SharedSelectors.getConnectionStatus()).isOnline)
            this._accountModel$.next(this.getGegevens(await firstValueFrom(this.getAccountGegevens$())));
    }

    public getGegevens(account: RAccount): AccountModel {
        if (!account.gebruikersnaam) {
            throw new Error('Gebruikersnaam mag niet null of undefined zijn');
        } else {
            const isVerzorger = account.persoon?.links?.[0].type === 'verzorger.RVerzorger';
            const adres = (account.additionalObjects?.['adres'] as RAdres) ?? {};
            const restricties = (account.additionalObjects?.['restricties']?.items[0] as REloRestricties) ?? {};
            const gebruikersnaam = account.gebruikersnaam;

            return isVerzorger
                ? this.mapVerzorgerAccountModel(gebruikersnaam, adres, restricties, account.persoon as RVerzorger)
                : this.mapLeerlingAccountModel(gebruikersnaam, adres, restricties, account.persoon as RLeerling);
        }
    }

    public mapVerzorgerAccountModel(
        gebruikersnaam: string,
        adres: RAdres,
        restricties: REloRestricties,
        verzorger: RVerzorger
    ): AccountModel {
        return {
            gebruikersnaam: gebruikersnaam,
            naam: [verzorger?.voorletters, verzorger?.voorvoegsel, verzorger?.achternaam].filter(Boolean).join(' '),
            wachtwoordWijzigenAan: restricties.wachtwoordWijzigenAan ?? false,
            emailWijzigenAan: restricties.emailWijzigenAan ?? false,
            mobielWijzigenAan: restricties.mobielWijzigenAan ?? false,
            leerlingnummer: '',
            geboortedatum: '',
            buitenland1: adres.isBuitenlandsAdres ? (adres.buitenland1 ?? '') : '',
            buitenland2: adres.isBuitenlandsAdres ? (adres.buitenland2 ?? '') : '',
            buitenland3: adres.isBuitenlandsAdres ? (adres.buitenland3 ?? '') : '',
            straatnaam: !adres.isBuitenlandsAdres ? (adres.straat ?? '') : '',
            huisnummer: !adres.isBuitenlandsAdres ? (adres.huisnummer ?? '') : '',
            postcode: !adres.isBuitenlandsAdres ? (adres.postcode ?? '') : '',
            land: adres.land ?? '',
            woonplaats: !adres.isBuitenlandsAdres ? (adres.plaatsnaam ?? '') : '',
            telnummer: adres.telefoonnummer ?? '',
            mobielnummer: verzorger?.mobielNummer ?? '',
            werknummer: verzorger?.mobielWerkNummer ? (verzorger?.mobielWerkNummer ?? '') : '',
            eMail: verzorger.email ?? ''
        } as AccountModel;
    }

    public mapLeerlingAccountModel(gebruikersnaam: string, adres: RAdres, restricties: REloRestricties, leerling: RLeerling): AccountModel {
        return {
            gebruikersnaam: gebruikersnaam,
            naam: [leerling?.roepnaam, leerling?.voorvoegsel, leerling?.achternaam].filter(Boolean).join(' '),
            wachtwoordWijzigenAan: restricties.wachtwoordWijzigenAan ?? false,
            emailWijzigenAan: restricties.emailWijzigenAan ?? false,
            mobielWijzigenAan: restricties.mobielWijzigenAan ?? false,
            leerlingnummer: leerling?.leerlingnummer ?? '',
            geboortedatum: leerling?.geboortedatum ? format(parseISO(leerling?.geboortedatum), 'dd-MM-yyyy') : '',
            buitenland1: adres.isBuitenlandsAdres ? (adres.buitenland1 ?? '') : '',
            buitenland2: adres.isBuitenlandsAdres ? (adres.buitenland2 ?? '') : '',
            buitenland3: adres.isBuitenlandsAdres ? (adres.buitenland3 ?? '') : '',
            straatnaam: !adres.isBuitenlandsAdres ? (adres.straat ?? '') : '',
            huisnummer: !adres.isBuitenlandsAdres ? (adres.huisnummer ?? '') : '',
            postcode: !adres.isBuitenlandsAdres ? (adres.postcode ?? '') : '',
            land: adres.land ?? '',
            woonplaats: !adres.isBuitenlandsAdres ? (adres.plaatsnaam ?? '') : '',
            telnummer: adres.telefoonnummer ?? '',
            mobielnummer: leerling?.mobielNummer ?? '',
            werknummer: '',
            eMail: leerling?.email ?? ''
        } as AccountModel;
    }
}
