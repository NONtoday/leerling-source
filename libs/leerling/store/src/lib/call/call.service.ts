import { inject, Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { StoreCallStart, StoreCallSuccess } from './call-actions';
import { CallSelectors } from './call-selectors';

export interface SCallDefinition {
    callNaam: string;
    parameters: any[];
    timeout: number;
}

export const MIN = 60 * 1000;
export const UUR = 60 * MIN;
export const DAG = 24 * UUR;

const _8_UUR = 8 * UUR;
const _15_MIN = 15 * MIN;
const _3_MIN = 3 * MIN;

@Injectable({
    providedIn: 'root'
})
export class CallService {
    public static readonly AFSPRAKEN_TIMEOUT = _3_MIN;

    public static readonly RESULTATEN_TIMEOUT = _15_MIN;
    public static readonly STUDIEMATERIAAL_TIMEOUT = _15_MIN;
    public static readonly SWI_TIMEOUT = _15_MIN;
    public static readonly VAKKEUZE_GEMIDDELDE_TIMEOUT = _15_MIN;
    public static readonly MAATREGELEN_TIMEOUT = _15_MIN;
    public static readonly ABSENTIE_TIMEOUT = _15_MIN;

    public static readonly BERICHTEN_TIMEOUT = UUR;
    public static readonly LANDELIJKE_MEDEDELINGEN_TIMEOUT = UUR;

    public static readonly EDUROUTEPORTAL_TIMEOUT = _8_UUR; // Wordt nachtelijks ververst in Somtoday.
    public static readonly VAKKEN_TIMEOUT = _8_UUR;

    public static readonly CIJFERPERIODEN_TIMEOUT = DAG;
    public static readonly PLAATSING_TIMEOUT = DAG;
    public static readonly RECHTEN_TIMEOUT = DAG;
    public static readonly SCHOOLJAAR_TIMEOUT = DAG;
    public static readonly VAKANTIE_TIMEOUT = DAG;
    public static readonly REGISTRATIES_TIMEOUT = DAG;

    private _store = inject(Store);

    public isCallStillFresh(call: SCallDefinition): boolean {
        return this._store.selectSnapshot(CallSelectors.isCallStillFresh(call.callNaam, call.parameters, call.timeout));
    }

    public storeCallSuccess(call: SCallDefinition) {
        this._store.dispatch(new StoreCallSuccess(call.callNaam, call.parameters, call.timeout));
    }

    public isCallRecentlyMade(call: SCallDefinition): boolean {
        return this._store.selectSnapshot(CallSelectors.isCallRecentlyMade(call.callNaam, call.parameters));
    }

    public storeCallStart(call: SCallDefinition) {
        this._store.dispatch(new StoreCallStart(call.callNaam, call.parameters));
    }
}
