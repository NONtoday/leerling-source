import { createSelector } from '@ngxs/store';
import { compareAsc } from 'date-fns';
import { PlaatsingState } from '../..';
import { SPlaatsing, SPlaatsingModel } from './plaatsing-model';

export class PlaatsingSelectors {
    public static getPlaatsingen() {
        return createSelector([PlaatsingState], (state: SPlaatsingModel) => {
            if (state.plaatsingen === undefined) return undefined;
            return state.plaatsingen ?? [];
        });
    }

    public static getPlaatsing(peildatum: Date) {
        return createSelector([PlaatsingSelectors.getPlaatsingen()], (plaatsingen: SPlaatsing[]) => {
            if (plaatsingen === undefined) return undefined;
            return (
                plaatsingen.find(
                    (plaatsing) => compareAsc(plaatsing.vanafDatum, peildatum) <= 0 && compareAsc(plaatsing.totDatum, peildatum) > 0
                ) ?? {
                    id: 0,
                    UUID: '',
                    vanafDatum: new Date(),
                    totDatum: new Date(),
                    leerling: 0,
                    huidig: false,
                    stamgroepnaam: undefined,
                    opleidingsnaam: undefined,
                    leerjaar: undefined,
                    schooljaarnaam: undefined,
                    vestiging: undefined
                }
            );
        });
    }

    public static getHuidigeVestiging() {
        return createSelector([PlaatsingState], (state: SPlaatsingModel) => {
            if (state.schoolgegevens === undefined) return undefined;
            return state.schoolgegevens?.huidigeVestiging;
        });
    }

    public static getSchoolgegevens() {
        return createSelector([PlaatsingState], (state: SPlaatsingModel) => {
            return state.schoolgegevens;
        });
    }
}
