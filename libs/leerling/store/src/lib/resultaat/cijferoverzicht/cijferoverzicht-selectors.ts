import { createSelector } from '@ngxs/store';
import { SCijferOverzichtModel } from './cijferoverzicht-model';
import { CijferoverzichtState } from './cijferoverzicht-state';

export class CijferoverzichtSelectors {
    public static getVoortgangCijferoverzicht(plaatsingUuid: string) {
        return createSelector([CijferoverzichtState], (state: SCijferOverzichtModel) => {
            return state.voortgangOverzichten?.find((voortgang) => voortgang.plaatsingUuid === plaatsingUuid);
        });
    }

    public static getExamenCijferoverzicht(plaatsingUuid: string, lichtingUuid: string | undefined) {
        return createSelector([CijferoverzichtState], (state: SCijferOverzichtModel) => {
            return state.examenOverzichten?.find(
                (examen) => examen.plaatsingUuid === plaatsingUuid && examen.lichtingUuid === lichtingUuid
            );
        });
    }
}
