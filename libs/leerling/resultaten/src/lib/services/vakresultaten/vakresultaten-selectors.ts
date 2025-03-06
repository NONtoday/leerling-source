import { createSelector } from '@ngxs/store';
import { SToetskolommen, SVakExamenResultaat, SVakVoortgangsResultaat, VakResultaatSelectors } from 'leerling/store';
import {
    VakExamendossier,
    VakVoortgangsdossier,
    combineerWegingen,
    mapToVakExamendossier,
    mapToVakVoortgangsdossier
} from './vakresultaten-model';

export class VakResultatenSelectors {
    public static getVakVoortgangsdossier(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector(
            [VakResultaatSelectors.getVoortgangsResultaten(vakUuid, lichtingUuid, plaatsingUuid)],
            (voortgangsResultaat: SVakVoortgangsResultaat) => mapToVakVoortgangsdossier(voortgangsResultaat)
        );
    }

    public static getVakExamendossier(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector(
            [VakResultaatSelectors.getExamenResultaten(vakUuid, lichtingUuid, plaatsingUuid)],
            (examenResultaat: SVakExamenResultaat) => mapToVakExamendossier(examenResultaat)
        );
    }
    public static getVakVoortgangsdossierMetKolommen(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector(
            [
                VakResultaatSelectors.getVoortgangsResultaten(vakUuid, lichtingUuid, plaatsingUuid),
                VakResultaatSelectors.getVoortgangsKolommen(vakUuid, lichtingUuid, plaatsingUuid)
            ],
            (voortgangsResultaat: SVakVoortgangsResultaat, kolommen: SToetskolommen) =>
                mapToVakVoortgangsdossier(voortgangsResultaat, kolommen)
        );
    }
    public static getVakExamendossierMetKolommen(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector(
            [
                VakResultaatSelectors.getExamenResultaten(vakUuid, lichtingUuid, plaatsingUuid),
                VakResultaatSelectors.getExamenKolommen(vakUuid, lichtingUuid, plaatsingUuid)
            ],
            (examenResultaat: SVakExamenResultaat, kolommen: SToetskolommen) => mapToVakExamendossier(examenResultaat, kolommen)
        );
    }

    public static getVakToetsdossierMetKolommen(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector(
            [
                this.getVakVoortgangsdossierMetKolommen(vakUuid, lichtingUuid, plaatsingUuid),
                this.getVakExamendossierMetKolommen(vakUuid, lichtingUuid, plaatsingUuid)
            ],
            (vakVoortgangsdossier: VakVoortgangsdossier | undefined, vakExamendossier: VakExamendossier | undefined) => {
                combineerWegingen(vakVoortgangsdossier, vakExamendossier);

                if (!vakVoortgangsdossier && !vakExamendossier) {
                    return undefined;
                }

                return {
                    vakNaam: vakVoortgangsdossier?.vaknaam ?? vakExamendossier?.vaknaam,
                    voortgangsdossier: vakVoortgangsdossier,
                    examendossier: vakExamendossier
                };
            }
        );
    }
    public static getVakToetsdossier(vakUuid: string, lichtingUuid: string, plaatsingUuid?: string) {
        return createSelector(
            [
                this.getVakVoortgangsdossier(vakUuid, lichtingUuid, plaatsingUuid),
                this.getVakExamendossier(vakUuid, lichtingUuid, plaatsingUuid)
            ],
            (vakVoortgangsdossier: VakVoortgangsdossier | undefined, vakExamendossier: VakExamendossier | undefined) => {
                combineerWegingen(vakVoortgangsdossier, vakExamendossier);

                if (!vakVoortgangsdossier && !vakExamendossier) {
                    return undefined;
                }

                return {
                    vakNaam: vakVoortgangsdossier?.vaknaam ?? vakExamendossier?.vaknaam,
                    voortgangsdossier: vakVoortgangsdossier,
                    examendossier: vakExamendossier
                };
            }
        );
    }
}
