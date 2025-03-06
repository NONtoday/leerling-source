import { createSelector } from '@ngxs/store';
import { getYear } from 'date-fns';
import {
    DossierType,
    ExamendossierContextSelectors,
    getPlaatsingOmschrijving,
    PlaatsingSelectors,
    SExamendossierContext,
    SPlaatsing
} from 'leerling/store';

export interface PlaatsingEnExamenData {
    type: DossierType;
    eindschooljaar: number;
    plaatsing?: SPlaatsing;
    examendossierContext?: SExamendossierContext;
}

export interface PlaatsingEnExamenItem {
    identifier: string;
    label: string;
    data: PlaatsingEnExamenData;
}

export class PlaatsingEnExamenItemSelectors {
    public static getSelectieWaarden() {
        return createSelector(
            [ExamendossierContextSelectors.getExamendossierContexten(), PlaatsingSelectors.getPlaatsingen()],
            (examendossierContexten, plaatsingen) => {
                if (!examendossierContexten || !plaatsingen) {
                    return undefined;
                }

                const examenWaarden: PlaatsingEnExamenItem[] = examendossierContexten.map((context) => {
                    return {
                        identifier: `Examen-${context.plaatsingUuid}-${context.lichtingUuid}`,
                        label: `Examencijfers ${context.onderwijssoort} ${context.examenjaar}`,
                        data: {
                            type: 'Examen',
                            eindschooljaar: context.examenjaar,
                            examendossierContext: context
                        }
                    };
                });

                const selectieWaarden: PlaatsingEnExamenItem[] = examenWaarden.concat(
                    plaatsingen.map((plaatsing) => {
                        return {
                            identifier: `Voortgang-${plaatsing.id}`,
                            label: getPlaatsingOmschrijving(plaatsing),
                            data: {
                                type: 'Voortgang',
                                eindschooljaar: getYear(plaatsing.totDatum),
                                plaatsing: plaatsing
                            }
                        };
                    })
                );

                selectieWaarden.sort((a, b) => {
                    if (a.data.eindschooljaar !== b.data.eindschooljaar) {
                        return b.data.eindschooljaar - a.data.eindschooljaar;
                    }

                    if (a.data.type !== b.data.type) {
                        // Examenkeuze boven voortgangskeuze
                        return a.data.type === 'Examen' ? -1 : 1;
                    }

                    return 0;
                });

                return selectieWaarden;
            }
        );
    }
}
