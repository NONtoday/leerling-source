import { createSelector } from '@ngxs/store';
import { orderBy } from 'lodash-es';
import { DossierType, SGeldendResultaat, SToetskolom } from '../geldendresultaat-model';
import {
    createVakResultaatKey,
    emptyGeldendResultaat,
    SToetskolomMap,
    SVakExamenResultaatMap,
    SVakResultaatModel,
    SVakVoortgangsResultaatMap
} from './vakresultaat-model';
import { VakResultaatState } from './vakresultaat-state';

export class VakResultaatSelectors {
    public static getAlleVoortgangsResultaten() {
        return createSelector([VakResultaatState], (state: SVakResultaatModel) => {
            if (state.geldendVoortgangsResultaten === undefined) return undefined;
            return state.geldendVoortgangsResultaten ?? {};
        });
    }

    public static getAlleVoortgangsKolommen() {
        return createSelector([VakResultaatState], (state: SVakResultaatModel) => {
            if (state.voortgangsKolommen === undefined) return undefined;
            return state.voortgangsKolommen ?? {};
        });
    }

    public static getAlleExamenResultaten() {
        return createSelector([VakResultaatState], (state: SVakResultaatModel) => {
            if (state.geldendExamenResultaten === undefined) return undefined;
            return state.geldendExamenResultaten ?? {};
        });
    }

    public static getAlleExamenKolommen() {
        return createSelector([VakResultaatState], (state: SVakResultaatModel) => {
            if (state.examenKolommen === undefined) return undefined;
            return state.examenKolommen ?? {};
        });
    }

    public static getVoortgangsResultaten(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector([this.getAlleVoortgangsResultaten()], (resultaten?: SVakVoortgangsResultaatMap) => {
            if (resultaten === undefined) return undefined;
            return resultaten[createVakResultaatKey(vakUuid, lichtingUuid, plaatsingUuid)];
        });
    }

    public static getVoortgangsKolommen(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector([this.getAlleVoortgangsKolommen()], (kolommen?: SToetskolomMap) => {
            if (kolommen === undefined) return undefined;
            return kolommen[createVakResultaatKey(vakUuid, lichtingUuid, plaatsingUuid)];
        });
    }

    public static getExamenResultaten(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector([this.getAlleExamenResultaten()], (resultaten?: SVakExamenResultaatMap) => {
            if (resultaten === undefined) return undefined;
            return resultaten[createVakResultaatKey(vakUuid, lichtingUuid, plaatsingUuid)];
        });
    }

    public static getExamenKolommen(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector([this.getAlleExamenKolommen()], (kolommen?: SToetskolomMap) => {
            if (kolommen === undefined) return undefined;
            return kolommen[createVakResultaatKey(vakUuid, lichtingUuid, plaatsingUuid)];
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

    public static getDeeltoetsenMetKolommen(samengesteldeToetsId: number, dossier: DossierType) {
        return createSelector([VakResultaatState], (state: SVakResultaatModel) => {
            if (dossier === 'Voortgang') {
                const voortgangsToetsen = state.voortgangsdossierDeeltoetsen || [];
                const voortgangsKolommen = state.voortgangsdossierDeeltoetsKolommen || [];
                return this.concatToetsenEnKolommen(
                    voortgangsToetsen[samengesteldeToetsId] ?? [],
                    voortgangsKolommen[samengesteldeToetsId] ?? []
                );
            } else {
                const examenToetsen = state.examendossierDeeltoetsen || [];
                const examenKolommen = state.examendossierDeeltoetsKolommen || [];
                return this.concatToetsenEnKolommen(examenToetsen[samengesteldeToetsId] ?? [], examenKolommen[samengesteldeToetsId] ?? []);
            }
        });
    }

    private static concatToetsenEnKolommen(geldendeResultaten: SGeldendResultaat[] = [], sToetskolommen: SToetskolom[] = []) {
        const geldendeResultatenMetKolommen = [...geldendeResultaten];
        sToetskolommen.forEach((kolom) => {
            // let op, er is geen kolom beschikbaar in de deeltoetsresultaten dus find ik op omschrijving + volgnummer.
            const resultaatVoorKolom = geldendeResultaten.find(
                (resultaat) => resultaat.omschrijving == kolom.omschrijving && resultaat.volgnummer == kolom.volgnummer
            );
            if (!resultaatVoorKolom) {
                geldendeResultatenMetKolommen.push(emptyGeldendResultaat(kolom));
            }
        });
        return orderBy(geldendeResultatenMetKolommen, ['volgnummer'], ['desc']);
    }
}
