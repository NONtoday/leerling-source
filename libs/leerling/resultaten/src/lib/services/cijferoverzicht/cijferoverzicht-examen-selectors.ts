import { createSelector } from '@ngxs/store';
import { CijferoverzichtSelectors, RechtenSelectors, SExamenVakExamenResultaten } from 'leerling/store';

export interface ToetsoortGemiddeldenData {
    naam: string;
    afkorting: string;
}

export interface CijferoverzichtExamenData {
    maxAantalToetsen: number;
    toetssoortgemiddelden: ToetsoortGemiddeldenData[];
    toonSEKolom: boolean;
    vakResultaten: SExamenVakExamenResultaten[];
}

export class CijferoverzichtExamenSelectors {
    public static getExamenData(plaatsingUuid: string, lichtingUuid: string | undefined) {
        return createSelector(
            [CijferoverzichtSelectors.getExamenCijferoverzicht(plaatsingUuid, lichtingUuid), RechtenSelectors.heeftRecht('seResultaatAan')],
            (cijferoverzicht, heeftSERecht) => {
                if (!cijferoverzicht) return undefined;

                return {
                    toonSEKolom: heeftSERecht,
                    toetssoortgemiddelden: [
                        // Ontdubbel de lijst: Maak een map met de afkortingen als key en neem daarna de values.
                        ...new Map(
                            cijferoverzicht.examenVakResultaten
                                .flatMap((vakresultaten) => vakresultaten.toetssoortGemiddelden)
                                .map((toetssoortgemiddelde) => {
                                    return [
                                        toetssoortgemiddelde.toetssoortafkorting,
                                        {
                                            naam: toetssoortgemiddelde.toetssoort,
                                            afkorting: toetssoortgemiddelde.toetssoortafkorting
                                        } satisfies ToetsoortGemiddeldenData
                                    ];
                                })
                        ).values()
                    ].sort((a, b) => a.afkorting.localeCompare(b.afkorting)),
                    maxAantalToetsen: Math.max(
                        ...cijferoverzicht.examenVakResultaten.map((vakresultaten) => vakresultaten.resultaten.length)
                    ),
                    vakResultaten: cijferoverzicht.examenVakResultaten
                } satisfies CijferoverzichtExamenData;
            }
        );
    }
}
