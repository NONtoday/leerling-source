import { createSelector } from '@ngxs/store';
import { DossierType } from '../geldendresultaat-model';
import { SVakExamenResultaatMap, SVakResultaatModel, SVakVoortgangsResultaatMap, createVakResultaatKey } from './vakresultaat-model';
import { VakResultaatState } from './vakresultaat-state';

export class VakResultaatSelectors {
    public static getAlleVoortgangsResultaten() {
        return createSelector([VakResultaatState], (state: SVakResultaatModel) => {
            if (state.geldendVoortgangsResultaten === undefined) return undefined;
            return state.geldendVoortgangsResultaten ?? {};
        });
    }

    public static getAlleExamenResultaten() {
        return createSelector([VakResultaatState], (state: SVakResultaatModel) => {
            if (state.geldendExamenResultaten === undefined) return undefined;
            return state.geldendExamenResultaten ?? {};
        });
    }

    public static getVoortgangsResultaten(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector([this.getAlleVoortgangsResultaten()], (resultaten: SVakVoortgangsResultaatMap) => {
            if (resultaten === undefined) return undefined;
            return resultaten[createVakResultaatKey(vakUuid, lichtingUuid, plaatsingUuid)];
        });
    }

    public static getExamenResultaten(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector([this.getAlleExamenResultaten()], (resultaten: SVakExamenResultaatMap) => {
            if (resultaten === undefined) return undefined;
            return resultaten[createVakResultaatKey(vakUuid, lichtingUuid, plaatsingUuid)];
        });
    }

    public static getDeeltoetsen(samengesteldeToetsId: number, dossier: DossierType) {
        return createSelector([VakResultaatState], (state: SVakResultaatModel) => {
            if (dossier === 'Voortgang') {
                if (state.voortgangsdossierDeeltoetsen === undefined) return undefined;
                return state.voortgangsdossierDeeltoetsen[samengesteldeToetsId] ?? [];
            } else {
                if (state.examendossierDeeltoetsen === undefined) return undefined;
                return state.examendossierDeeltoetsen[samengesteldeToetsId] ?? [];
            }
        });
    }
}
