import { createSelector } from '@ngxs/store';
import { SCallModel, SCallType } from './call-model';
import { CallState } from './call-state';

export const SECONDS = 1000;
// binnen 15 seconden niet eenzelfde call opstarten
export const CALL_DELAY = 15 * SECONDS;
export class CallSelectors {
    private static getCallType(callNaam: string) {
        return createSelector([CallState], (state: SCallModel) => {
            return state.callTypes[callNaam];
        });
    }

    /**
     * Een call is fresh als een call met dezelfde parameters binnen de timeout nog gedaan is.
     */
    static isCallStillFresh(callNaam: string, parameters: any[], timeout: number) {
        return createSelector([CallSelectors.getCallType(callNaam)], (callType: SCallType) => {
            const tsLastSync = callType?.calls.find((item) => item.paramsJsonStringify == JSON.stringify(parameters))?.tsLastSync;
            return tsLastSync ? tsLastSync + timeout > new Date().getTime() : false;
        });
    }

    static isCallRecentlyMade(callNaam: string, parameters: any[]) {
        return createSelector([CallSelectors.getCallType(callNaam)], (callType: SCallType) => {
            const tsLastCallStarted = callType?.calls.find((item) => item.paramsJsonStringify == JSON.stringify(parameters))
                ?.tsLastCallStarted;
            return tsLastCallStarted ? tsLastCallStarted + CALL_DELAY > new Date().getTime() : false;
        });
    }
}
