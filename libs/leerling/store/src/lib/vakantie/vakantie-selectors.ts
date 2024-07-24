import { createSelector } from '@ngxs/store';
import {
    Interval,
    addDays,
    areIntervalsOverlapping,
    differenceInCalendarDays,
    isEqual,
    isWithinInterval,
    max,
    min,
    startOfDay
} from 'date-fns';
import { SVakantieModel } from './vakantie-model';
import { VakantieState } from './vakantie-state';

//Kap een vakantie af binnen de gewenste interval.
// (dus als je 1 dag op vraagt en er is vakantie van een week, krijg je 1 vakantiedag terug)
export interface Vakantie {
    naam: string;
    intervalInRange: Interval;
}

export interface VakantieDisplay {
    // Ofwel vakantie ofwel geen vakantie.
    vakantie: Vakantie | undefined;
    // maandag = 1 - zondag = 7
    begindag: number;
    einddag: number;
}

export class VakantieSelectors {
    public static getVakanties(beginDatum: Date, eindDatum: Date) {
        const peilInterval = { start: beginDatum, end: eindDatum };

        return createSelector([VakantieState], (state: SVakantieModel) => {
            return state.vakanties
                .filter((vakantie) => {
                    const vakantieInterval: Interval = { start: vakantie.beginDatum, end: vakantie.eindDatum };
                    return areIntervalsOverlapping(peilInterval, vakantieInterval, { inclusive: true });
                })
                .map((sVakantie) => {
                    const vakantie: Vakantie = {
                        naam: sVakantie.naam,
                        intervalInRange: { start: max([beginDatum, sVakantie.beginDatum]), end: min([eindDatum, sVakantie.eindDatum]) }
                    };
                    return vakantie;
                });
        });
    }

    public static getVakantieDisplay(beginDatum: Date, eindDatum: Date) {
        return createSelector([this.getVakanties(beginDatum, eindDatum)], (vakanties: Vakantie[]) => {
            const vakantieDisplays: VakantieDisplay[] = [];

            // Geen enkele vakantie: geef dan maar niets terug.
            if (vakanties.length === 0) {
                return vakantieDisplays;
            }

            let currentDate = beginDatum;
            while (currentDate <= eindDatum) {
                const currentVakantie = vakanties.find((vakantie) => isWithinInterval(currentDate, vakantie.intervalInRange));
                const aantalDagen = bepaalAantalDagen(currentVakantie);
                let begindag = currentDate.getDay();
                if (begindag === 0) {
                    begindag = 7;
                }

                vakantieDisplays.push({ vakantie: currentVakantie, begindag: begindag, einddag: begindag + aantalDagen - 1 });
                currentDate = addDays(currentDate, aantalDagen);
            }

            // Bij een dagview, begint/eindigt alles op dag 1
            if (isEqual(startOfDay(beginDatum), startOfDay(eindDatum)) && vakantieDisplays.length > 0) {
                vakantieDisplays[0].begindag = 1;
                vakantieDisplays[0].einddag = 1;
            }

            return vakantieDisplays;
        });
    }
}

function bepaalAantalDagen(vakantie: Vakantie | undefined): number {
    // Er is geen vakantie, dan hebben we 1 dag, namelijk in ieder geval vandaag.
    if (!vakantie) return 1;

    // Omdat we datums zonder tijd hebben, moeten we er 1 bij optellen.
    // 2023-11-06 0:00 tot 2023-11-07 0:00 ziet hij als 1 dag, terwijl we toch echt 2 dagen vakantie hebben.
    return differenceInCalendarDays(vakantie.intervalInRange.end, vakantie.intervalInRange.start) + 1;
}
