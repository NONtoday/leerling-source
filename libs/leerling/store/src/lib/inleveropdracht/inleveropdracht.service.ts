import { inject, Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { isBefore } from 'date-fns';
import { isPresent } from 'harmony';
import { RequestInformationBuilder, RequestService } from 'leerling-request';
import { Observable, switchMap, take } from 'rxjs';
import { MarkeerInleverboodschapGelezen } from '../bericht/bericht-actions';
import { SBoodschap } from '../bericht/bericht-model';
import { SStudiewijzerItem } from '../huiswerk/huiswerk-model';
import { AddSuccessMessage } from '../infomessage/infomessage-actions';
import { AccepteerEula, RefreshInleverDetails, VerstuurReactie, VerwijderInlevering } from './inleveropdracht-actions';
import { SInleverDetails } from './inleveropdracht-model';
import { InleveropdrachtSelectors } from './inleveropdracht-selectors';

@Injectable({
    providedIn: 'root'
})
export class InleveropdrachtService {
    private _store = inject(Store);
    private _requestService = inject(RequestService);

    public getInleverDetails(toekenningId: number, toekenningDatum: Date): Observable<SInleverDetails | undefined> {
        this.refreshInleverDetails(toekenningId, toekenningDatum);
        return this._store.select(InleveropdrachtSelectors.getInleverDetails(toekenningId));
    }

    public acceptLatestTurnitInEula(): Observable<void> {
        return this._store.dispatch(new AccepteerEula());
    }

    public verstuurReactie(toekenningId: number, toekenningsDatum: Date, reactie: string) {
        this._store
            .dispatch(new VerstuurReactie(toekenningId, toekenningsDatum, reactie))
            .pipe(take(1))
            .subscribe(this.dispatchReactieSuccessMessage);
    }

    public markReactiesAlsGelezen(boodschap: SBoodschap) {
        this._store.dispatch(new MarkeerInleverboodschapGelezen(boodschap));
    }

    private dispatchReactieSuccessMessage = () => this._store.dispatch(new AddSuccessMessage('Reactie verzonden!'));

    public inleveren(toekenningId: number, datum: Date, uploadContextIds: number[], urls: string[]): Observable<void> {
        return this._requestService
            .postWithResponse(
                `/studiewijzeritemdagtoekenningen/${toekenningId}/inleveren`,
                new RequestInformationBuilder()
                    .body({
                        uploadContextIds,
                        urls
                    })
                    .build()
            )
            .pipe(switchMap(() => this.refreshInleverDetails(toekenningId, datum)));
    }

    public verwijderInlevering(toekenningId: number, toekenningDatum: Date, inleveringId: number): void {
        this._store.dispatch(new VerwijderInlevering(toekenningId, inleveringId, toekenningDatum));
    }

    public magInleveren(item: SStudiewijzerItem): boolean {
        const inleverStart = item.inlevermoment?.start;
        const status = item.laatsteInleveringStatus;
        const magInleverenStatus = !status || status === 'HEROPEND' || status === 'TE_BEOORDELEN';
        return item.isInleveropdracht && magInleverenStatus && isPresent(inleverStart) && isBefore(inleverStart, new Date());
    }

    private refreshInleverDetails(toekenningId: number, toekenningDatum: Date): Observable<void> {
        return this._store.dispatch(new RefreshInleverDetails(toekenningId, toekenningDatum));
    }
}
