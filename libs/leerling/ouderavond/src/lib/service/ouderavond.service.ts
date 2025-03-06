import { HttpResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { isPresent } from 'harmony';
import {
    ROuderavond,
    ROuderavondAfspraakVerzoek,
    ROuderavondAfspraakVerzoekInput,
    ROuderavondData,
    ROuderavondKeuzeInput
} from 'leerling-codegen';
import { RequestInformationBuilder, RequestService } from 'leerling-request';
import { getEntiteitId } from 'leerling/store';
import { catchError, map, Observable, of } from 'rxjs';
import { AfspraakVerzoek, Ouderavond, OuderavondInfo } from '../model/ouderavond.model';
import { OuderavondData } from '../ouderavond-wizard/ouderavond-wizard.component';

@Injectable({
    providedIn: 'root'
})
export class OuderavondService {
    private _requestService = inject(RequestService);

    public getOuderavondInfo(id: string): Observable<OuderavondInfo | null> | undefined {
        return this._requestService.get<ROuderavondData>(`/ouderavond/${id}`).pipe(
            map((data) => this.mapOuderavondData(data)),
            catchError(() => of(null))
        );
    }

    public verwerkKeuzes(ouderAvondId: string, ouderavondData: OuderavondData, info: OuderavondInfo): Observable<HttpResponse<void>> {
        const verzoeken = info.afspraakVerzoeken
            .map(
                (verzoek) =>
                    ouderavondData.keuzes.find((keuze) => verzoek.id === keuze.id && (keuze.aangevraagd = true)) ||
                    ((verzoek.aangevraagd = false), verzoek)
            )
            .map(this.mapROuderavondAfspraakVerzoekInput);

        const body = {
            $type: 'ouderavond.ROuderavondKeuzeInput',
            opmerkingVoorRoostermaker: ouderavondData.opmerkingVoorRoostermaker,
            verzoeken: verzoeken,
            keuzesHash: info.keuzesHash
        } as ROuderavondKeuzeInput;

        return this._requestService.postWithResponse(
            `/ouderavond/${ouderAvondId}`,
            new RequestInformationBuilder().body(body).skipErrorMessageStatusCodes(HttpStatusCode.BadRequest).build()
        );
    }

    private mapOuderavondData(rData: ROuderavondData): OuderavondInfo {
        const leerling = rData.leerling;
        return {
            leerlingId: leerling ? getEntiteitId(leerling) : -1,
            leerlingNaam: leerling ? leerling.roepnaam + ' ' + leerling.achternaam : '',
            inschrijfStatus: rData.inschrijfStatus ?? 'NOG_GEEN_REACTIE',
            keuzesHash: rData.keuzesHash ?? -1,
            ouderavondDatums: this.mapDatums(rData.beschikbareDagen),
            heeftAfspraak: rData.heeftAfspraak ?? false,
            heeftMeerdereLeerlingUitnodigingenVoorDezeOuderavond: rData.heeftMeerdereLeerlingUitnodigingenVoorDezeOuderavond ?? false,
            isOpmerkingVoorRoostermakerToegestaan: rData.isOpmerkingVoorRoostermakerToegestaan ?? false,
            opmerkingVoorRoostermaker: rData.opmerkingVoorRoostermaker,
            afspraakVerzoeken: this.mapVerzoeken(rData.afspraakVerzoeken),
            ouderavond: this.mapOuderavond(rData.ouderavond, rData.afspraakVerzoeken ? rData.afspraakVerzoeken?.length : 0),
            laatsteReactie: rData.laatsteReactie ? new Date(rData.laatsteReactie) : new Date()
        };
    }

    private mapOuderavond(ouderavond: ROuderavond | undefined, aantalAfspraakverzoeken: number): Ouderavond {
        const maxAantalGesprekken = ouderavond?.maxAantalGesprekken
            ? Math.min(ouderavond.maxAantalGesprekken, aantalAfspraakverzoeken)
            : aantalAfspraakverzoeken;

        return {
            aanvragenTot: ouderavond?.aanvragenTot ? new Date(ouderavond.aanvragenTot) : new Date(),
            maxAantalGesprekken: maxAantalGesprekken,
            naam: ouderavond?.naam ?? 'Ouderavond',
            omschrijving: ouderavond?.omschrijving ?? '-',
            verwijderdUitZermelo: ouderavond?.verwijderdUitZermelo ?? false,
            opmerkingDocentToegestaan: ouderavond?.opmerkingDocentToegestaan ?? false,
            extraLangGesprekToegestaan: ouderavond?.extraLangGesprekToegestaan ?? false
        };
    }

    private mapDatums(datumStrings: string[] | undefined): Date[] {
        if (!datumStrings) return [];
        return datumStrings.map((datumstring) => new Date(datumstring));
    }

    private mapVerzoeken(verzoeken: ROuderavondAfspraakVerzoek[] | undefined): AfspraakVerzoek[] {
        return verzoeken?.map(this.mapVerzoek).filter(isPresent) ?? [];
    }

    private mapVerzoek(verzoek: ROuderavondAfspraakVerzoek): AfspraakVerzoek | undefined {
        if (!verzoek.id) return;

        return {
            id: verzoek.id,
            aangevraagd: verzoek.aangevraagd ?? false,
            docenten: verzoek.docenten ?? [],
            extraGesprekstijd: verzoek.extraGesprekstijd ?? false,
            opmerkingVoorDocenten: verzoek.opmerkingVoorDocenten,
            titel: verzoek.titel ?? '-',
            vak: verzoek.vak ?? '-'
        };
    }

    public mapROuderavondAfspraakVerzoekInput(afspraakVerzoek: AfspraakVerzoek): ROuderavondAfspraakVerzoekInput {
        return {
            $type: 'ouderavond.ROuderavondAfspraakVerzoekInput',
            id: afspraakVerzoek.id,
            aangevraagd: afspraakVerzoek.aangevraagd,
            extraGesprekstijd: afspraakVerzoek.extraGesprekstijd,
            opmerkingVoorDocenten: afspraakVerzoek.opmerkingVoorDocenten
        } as ROuderavondAfspraakVerzoekInput;
    }
}
