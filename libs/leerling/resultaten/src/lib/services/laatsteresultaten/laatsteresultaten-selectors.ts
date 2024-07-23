import { createSelector } from '@ngxs/store';
import {
    LaatsteResultaatSelectors,
    SGeldendResultaat,
    SGeldendVoortgangsdossierResultaat,
    SSamengesteldeToets,
    SamengesteldeToetsDetailsSelectors
} from 'leerling/store';
import {
    LaatsteResultaat,
    SamengesteldeToetsDetails,
    mapToLaatsteResultaat,
    mapVoortgangsdossierToLaatsteResultaat
} from './laatsteresultaten-model';

export const AANTAL_LAATSTE_RESULTATEN_TONEN = 25;
export class LaatsteResultatenSelectors {
    public static getSamengesteldeToetsDetails(deeltoetsId: number, alternatief: boolean) {
        return createSelector(
            [SamengesteldeToetsDetailsSelectors.getSamengesteldeToets(deeltoetsId)],
            (samengesteldeToets: SSamengesteldeToets) => {
                if (!samengesteldeToets) return undefined;

                let toetsDetails: SamengesteldeToetsDetails;

                if (alternatief) {
                    toetsDetails = {
                        omschrijving: samengesteldeToets.omschrijving,
                        formattedResultaat: samengesteldeToets.formattedResultaatAlternatief ?? '',
                        isOnvoldoende: samengesteldeToets.isOnvoldoendeAlternatief ?? false
                    };
                } else {
                    toetsDetails = samengesteldeToets;
                }
                return toetsDetails;
            }
        );
    }

    public static getLaatsteVoortgangsResultaten() {
        return createSelector(
            [LaatsteResultaatSelectors.getVoortgangsResultaten()],
            (resultaten: SGeldendVoortgangsdossierResultaat[] | undefined) => {
                return resultaten?.flatMap((geldendVoorgangsResultaat) =>
                    mapVoortgangsdossierToLaatsteResultaat(geldendVoorgangsResultaat)
                );
            }
        );
    }

    public static getLaatsteExamenResultaten() {
        return createSelector([LaatsteResultaatSelectors.getExamenResultaten()], (resultaten: SGeldendResultaat[] | undefined) => {
            return resultaten?.flatMap((geldendExamenResultaat) => mapToLaatsteResultaat(geldendExamenResultaat));
        });
    }

    private static createIdentifier(laatsteResultaat: LaatsteResultaat): string {
        return laatsteResultaat.resultaatkolom + '-' + laatsteResultaat.herkansing + '-' + laatsteResultaat.isAlternatief;
    }

    public static getLaatsteResultaten() {
        return createSelector(
            [this.getLaatsteVoortgangsResultaten(), this.getLaatsteExamenResultaten()],
            (
                laatsteResultatenVoortgangsdossier: LaatsteResultaat[] | undefined,
                laatsteResultatenExamendossier: LaatsteResultaat[] | undefined
            ) => {
                if (!laatsteResultatenVoortgangsdossier && !laatsteResultatenExamendossier) {
                    return undefined;
                }
                // Een resultaat kan zowel in voortgangsdossier als examendossier zitten.
                // Middels deze map ontdubbelen we dezelfde resultaten.
                const laatsteResultatenMap: Map<string, LaatsteResultaat> = new Map();

                laatsteResultatenVoortgangsdossier?.forEach((laatsteResultaat) => {
                    laatsteResultatenMap.set(this.createIdentifier(laatsteResultaat), laatsteResultaat);
                });
                laatsteResultatenExamendossier?.forEach((laatsteResultaat) => {
                    const identifier = this.createIdentifier(laatsteResultaat);
                    const matchendResultaat = laatsteResultatenMap.get(identifier);
                    if (matchendResultaat) {
                        // Resultaat bestaat al uit voortgangsdossier. Koppel het aan het geldendresultaat van het examendossier
                        matchendResultaat.geldendResultaten.push(...laatsteResultaat.geldendResultaten);
                        // eventueel afwijkende weging
                        if (matchendResultaat.geldendResultaten[0].weging !== matchendResultaat.geldendResultaten[1].weging) {
                            matchendResultaat.afwijkendeWegingExamen = matchendResultaat.geldendResultaten[1].weging + 'x';
                        }
                    } else {
                        // Resultaat alleen in examendossier, voeg het toe.
                        laatsteResultatenMap.set(identifier, laatsteResultaat);
                    }
                });

                const laatsteResultaten = [...laatsteResultatenMap.values()].sort((a: LaatsteResultaat, b: LaatsteResultaat) =>
                    this.compareLaatsteResultaat(a, b)
                );

                return laatsteResultaten.slice(0, AANTAL_LAATSTE_RESULTATEN_TONEN);
            }
        );
    }

    private static compareLaatsteResultaat(a: LaatsteResultaat, b: LaatsteResultaat): number {
        const timeA = this.getTime(a.datum);
        const timeB = this.getTime(b.datum);
        if (timeA === timeB) {
            // Gelijke tijd => het ene cijfer is op normale niveau, het andere op alternatief niveau.
            // Als B alternatief niveau is, willen we die boven het originele cijfer tonen.
            if (b.isAlternatief) return 1;
            else return -1;
        } else {
            //Sorteer van nieuw naar oud
            return timeB - timeA;
        }
    }

    private static getTime(date?: Date): number {
        return date != null ? date.getTime() : 0;
    }
}
