import { createSelector } from '@ngxs/store';
import { SLaatsteResultaatModel } from './laatsteresultaat-model';
import { LaatsteResultaatState } from './laatsteresultaat-state';

export class LaatsteResultaatSelectors {
    public static getVoortgangsResultaten() {
        return createSelector([LaatsteResultaatState], (state: SLaatsteResultaatModel) => {
            if (state.geldendVoortgangsResultaten === undefined) return undefined;
            return state.geldendVoortgangsResultaten ?? [];
        });
    }

    public static getExamenResultaten() {
        return createSelector([LaatsteResultaatState], (state: SLaatsteResultaatModel) => {
            if (state.geldendExamenResultaten === undefined) return undefined;
            return state.geldendExamenResultaten ?? [];
        });
    }
}
