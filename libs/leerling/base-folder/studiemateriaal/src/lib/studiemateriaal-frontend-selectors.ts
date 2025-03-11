import { createSelector } from '@ngxs/store';
import { addDays, endOfDay, isSunday, nextSunday, startOfToday } from 'date-fns';
import { LesstofModel } from 'leerling-lesstof';
import {
    SJaarExternMateriaal,
    SJaarbijlage,
    SJaarbijlageMap,
    SLeermiddel,
    SStudiewijzerItem,
    StudiemateriaalSelectors
} from 'leerling/store';
import {
    JaarBijlage,
    JaarbijlageMap,
    JaarbijlagenModel,
    Leermiddel,
    LeermiddelModel,
    Studiemateriaal,
    mapAndSortLeermiddelen,
    mapExternMateriaal,
    mapJaarbijlage,
    mapJaarbijlageMap
} from '../../../../base-folder/studiemateriaal/src/lib/studiemateriaal-frontend-model';

function getEindVolgendeWeek(): Date {
    const vandaag = startOfToday();
    const zondag = isSunday(vandaag) ? vandaag : nextSunday(vandaag);
    return endOfDay(addDays(zondag, 7));
}

export class StudiemateriaalFrontendSelectors {
    private static getLesstofTotVolgendeWeek(vakOfLesgroepUuid: string) {
        return createSelector([StudiemateriaalSelectors.getLesstof(vakOfLesgroepUuid)], (lesstof: SStudiewijzerItem[]) => {
            if (lesstof === undefined) return undefined;

            const eindVolgendeWeek = getEindVolgendeWeek();
            return lesstof.filter((studiewijzerItem) => studiewijzerItem.datumTijd.getTime() < eindVolgendeWeek.getTime());
        });
    }

    private static getGesorteerdeLesstof(vakOfLesgroepUuid: string) {
        return createSelector([this.getLesstofTotVolgendeWeek(vakOfLesgroepUuid)], (lesstof: SStudiewijzerItem[]) => {
            if (lesstof === undefined) return undefined;

            return lesstof.sort((lesstofA, lesstofB) => lesstofB.datumTijd.getTime() - lesstofA.datumTijd.getTime());
        });
    }

    public static getLesstof(vakOfLesgroepUuid: string, aantalItems: number) {
        return createSelector([this.getGesorteerdeLesstof(vakOfLesgroepUuid)], (lesstof: SStudiewijzerItem[]) => {
            if (lesstof === undefined) return undefined;

            const result: LesstofModel = {
                totaalAantalLesstof: lesstof.length,
                geselecteerdeItems: lesstof.slice(0, aantalItems)
            };

            return result;
        });
    }

    public static getJaarBijlagen(vakOfLesgroepUuid: string) {
        return createSelector(
            [
                StudiemateriaalSelectors.getJaarbijlagenMappen(vakOfLesgroepUuid),
                StudiemateriaalSelectors.getJaarbijlagen(vakOfLesgroepUuid),
                StudiemateriaalSelectors.getExternMateriaal(vakOfLesgroepUuid)
            ],
            (sJaarBijlageMappen: SJaarbijlageMap[], sJaarBijlagen: SJaarbijlage[], sExterneMaterialen: SJaarExternMateriaal[]) => {
                if (!sJaarBijlageMappen || !sJaarBijlagen || !sExterneMaterialen) return undefined;

                const jaarBijlagenMappen: JaarbijlageMap[] = sJaarBijlageMappen.map((sJaarbijlageMap) =>
                    mapJaarbijlageMap(sJaarbijlageMap)
                );

                const algemeneJaarbijlagen: JaarBijlage[] = [];

                sJaarBijlagen.forEach((sJaarbijlage) => {
                    const jaarbijlage = mapJaarbijlage(sJaarbijlage);
                    const map = jaarBijlagenMappen.find((map) => map.id === sJaarbijlage.map?.id);

                    if (map) map.jaarbijlagen.push(jaarbijlage);
                    else algemeneJaarbijlagen.push(jaarbijlage);
                });

                sExterneMaterialen.forEach((sExternMateriaal) => {
                    const jaarbijlage = mapExternMateriaal(sExternMateriaal);
                    const map = jaarBijlagenMappen.find((map) => map.id === sExternMateriaal.map?.id);

                    if (map) map.jaarbijlagen.push(jaarbijlage);
                    else algemeneJaarbijlagen.push(jaarbijlage);
                });

                const result: JaarbijlagenModel = {
                    mappen: jaarBijlagenMappen
                        .map((map) => {
                            return {
                                id: map.id,
                                naam: map.naam,
                                sortering: map.sortering,
                                jaarbijlagen: map.jaarbijlagen.sort((a, b) => a.sortering - b.sortering)
                            };
                        })
                        .sort((a, b) => a.sortering - b.sortering),
                    jaarbijlagen: algemeneJaarbijlagen.sort((a, b) => a.sortering - b.sortering)
                };

                return result;
            }
        );
    }

    public static getAlgemeneLeermiddelen() {
        return createSelector([StudiemateriaalSelectors.getEduRoutePortalProducts()], (leermiddelen: SLeermiddel[]) => {
            return leermiddelen ? mapAndSortLeermiddelen(leermiddelen) : undefined;
        });
    }

    public static getLeermiddelen(vakOfLesgroepUuid: string) {
        return createSelector(
            [StudiemateriaalSelectors.getLeermiddelen(vakOfLesgroepUuid), this.getAlgemeneLeermiddelen()],
            (sLeermiddelen: SLeermiddel[] | undefined, algemeneLeermiddelen: Leermiddel[] | undefined) => {
                if (!sLeermiddelen || !algemeneLeermiddelen) return undefined;

                const result: LeermiddelModel = {
                    leermiddelen: mapAndSortLeermiddelen(sLeermiddelen),
                    algemeneLeermiddelen: algemeneLeermiddelen
                };
                return result;
            }
        );
    }

    public static getStudiemateriaal(vakUuid: string | undefined, lesgroepUuid: string | undefined, aantalLesstofItems: number) {
        const uuid = vakUuid ?? lesgroepUuid;
        if (!uuid) return createSelector([], () => undefined);
        return createSelector(
            [
                StudiemateriaalFrontendSelectors.getLeermiddelen(uuid),
                StudiemateriaalFrontendSelectors.getJaarBijlagen(uuid),
                StudiemateriaalFrontendSelectors.getLesstof(uuid, aantalLesstofItems)
            ],
            (leermiddelen: LeermiddelModel | undefined, jaarbijlagen: JaarbijlagenModel | undefined, lesstof: LesstofModel | undefined) => {
                if (!leermiddelen || !jaarbijlagen || !lesstof) return undefined;

                const materiaal: Studiemateriaal = {
                    leermiddelen: leermiddelen,
                    jaarbijlagen: jaarbijlagen,
                    lesstof: lesstof
                };
                return materiaal;
            }
        );
    }
}
