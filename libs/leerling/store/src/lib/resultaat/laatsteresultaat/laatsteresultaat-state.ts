import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { RGeldendResultaat, RGeldendVoortgangsdossierResultaat } from 'leerling-codegen';
import { RequestInformation, RequestInformationBuilder } from 'leerling-request';
import { forkJoin, tap } from 'rxjs';
import { CallService } from '../../call/call.service';
import { SwitchContext } from '../../shared/shared-actions';
import { AbstractState } from '../../util/abstract-state';
import {
    ADDITIONAL_LICHTING_UUID,
    ADDITIONAL_NAAM_ALTERNATIEF_NIVEAU,
    ADDITIONAL_RESULTAATKOLOM,
    ADDITIONAL_VAKNAAM,
    ADDITIONAL_VAK_UUID,
    createGeldendExamendossierResultaten,
    createGeldendVoortgangsdossierResultaten,
    isGeimporteerdSeResultaat
} from '../geldendresultaat-model';
import { RefreshLaatsteResultaat } from './laatsteresultaat-actions';
import { SLaatsteResultaatModel } from './laatsteresultaat-model';

// Meer dan 25 resultaten, aangezien geïmporteerde SE-resultaten ook meegenomen worden en we deze in de front-end eruit filteren
const AANTAL_LAATSTE_RESULTATEN_OPVRAGEN = 30;

export const LAATSTE_RESULTAAT_STATE_TOKEN = new StateToken<SLaatsteResultaatModel>('laatsteResultaat');
const DEFAULT_STATE = { geldendVoortgangsResultaten: undefined, geldendExamenResultaten: undefined };

@State<SLaatsteResultaatModel>({
    name: LAATSTE_RESULTAAT_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class LaatsteResultaatState extends AbstractState {
    @Action(RefreshLaatsteResultaat)
    refreshLaatsteResulaten(ctx: StateContext<SLaatsteResultaatModel>) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        const isStillFresh = this.isFresh(
            this.createCallDefinition(
                `geldendvoortgangsdossierresultaten/leerling/${leerlingID}`,
                this.getTimeout(),
                this.getLaatsteResultatenRequestInfo()
            ),
            this.createCallDefinition(
                `geldendexamendossierresultaten/leerling/${leerlingID}`,
                this.getTimeout(),
                this.getLaatsteResultatenRequestInfo()
            )
        );

        if (isStillFresh) {
            return;
        }

        const voortgangRequest = this.cachedUnwrappedGet<RGeldendVoortgangsdossierResultaat>(
            `geldendvoortgangsdossierresultaten/leerling/${leerlingID}`,
            this.getLaatsteResultatenRequestInfo(),
            { force: true }
        );

        const examenRequest = this.cachedUnwrappedGet<RGeldendResultaat>(
            `geldendexamendossierresultaten/leerling/${leerlingID}`,
            this.getLaatsteResultatenRequestInfo(),
            { force: true }
        );

        if (!voortgangRequest || !examenRequest) {
            return;
        }

        return forkJoin([voortgangRequest, examenRequest]).pipe(
            tap(([voortgangsResultaten, examenResultaten]) => {
                ctx.setState(
                    patch({
                        geldendVoortgangsResultaten: createGeldendVoortgangsdossierResultaten(voortgangsResultaten),
                        geldendExamenResultaten: createGeldendExamendossierResultaten(examenResultaten).filter(
                            (resultaat) => !isGeimporteerdSeResultaat(resultaat)
                        )
                    })
                );
            })
        );
    }

    private getLaatsteResultatenRequestInfo(): RequestInformation {
        return new RequestInformationBuilder()
            .parameter('type', ['Toetskolom', 'DeeltoetsKolom', 'Werkstukcijferkolom', 'Advieskolom'])
            .additionals(
                ADDITIONAL_VAKNAAM,
                ADDITIONAL_RESULTAATKOLOM,
                ADDITIONAL_NAAM_ALTERNATIEF_NIVEAU,
                ADDITIONAL_VAK_UUID,
                ADDITIONAL_LICHTING_UUID
            )
            .sortDesc('geldendResultaatCijferInvoer')
            .header('Range', 'items=0-' + AANTAL_LAATSTE_RESULTATEN_OPVRAGEN)
            .build();
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<any>): void {
        ctx.setState(DEFAULT_STATE);
    }

    override getTimeout(): number {
        return CallService.RESULTATEN_TIMEOUT;
    }
}
