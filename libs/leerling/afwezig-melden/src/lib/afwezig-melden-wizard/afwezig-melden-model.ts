import { addDays, addWeeks, getDate, getHours, getMinutes, getMonth, getYear, isBefore, isMonday, previousMonday } from 'date-fns';
import { formatDateNL } from 'leerling-util';
import { padStart, range, upperFirst } from 'lodash-es';

export interface WeekOptie {
    dagOpties: DagOptie[];

    /**
     * Toon de naam van de maand, als deze week een dag bevat die in een nieuwe maand begint.
     */
    maandNaam?: string;
}

export interface DagOptie {
    dagNaam: string;
    dagNummer: number;
    date: Date;
    disabled: boolean;
    heleDag: boolean;
}

export interface TijdOptie {
    disabled: boolean;
    hours: number;
    minutes: number;
    text: string;

    /**
     * Numerieke waarde van uren en minuten, bijv. `730` voor "07:30" of `1900` voor "19:00".
     */
    numericValue: number;
}

const NumBusinessDays = 5;

export function createWeekOpties(fromDate: Date, showWeken: number, now: Date): WeekOptie[] {
    const thisWeekMonday = isMonday(now) ? now : previousMonday(now);
    const fromWeekMonday = isMonday(fromDate) ? fromDate : previousMonday(fromDate);
    const fromWeekIsThisMonth = getMonth(fromWeekMonday) === getMonth(thisWeekMonday);
    const weekOpties: WeekOptie[] = [];

    /**
     * Dit wordt gebruikt om een nieuwe maand aan te duiden in het overzicht. We gebruiken 'nu' als punt van vergelijking,
     * zodat het voor de gebruiker duidelijk is dat ze kijken naar een andere maand dan de huidige.
     */
    let lastMonthDate = now;

    for (let weekIndex = 0; weekIndex < showWeken; weekIndex++) {
        const weekOptie: WeekOptie = { dagOpties: [] };
        let friday: Date | undefined = undefined;

        for (let dayIndex = 0; dayIndex < NumBusinessDays; dayIndex++) {
            const day = addDays(addWeeks(fromWeekMonday, weekIndex), dayIndex);
            weekOptie.dagOpties.push(createDagOptie(day, fromDate));

            // "It's Friday, Friday / Gotta get down on Friday" 🎶
            if (dayIndex === NumBusinessDays - 1) {
                friday = day;
            }
        }

        if (friday) {
            const fridayMonth = getMonth(friday);
            const fridayYear = getYear(friday);

            // geef de naam van de maand aan als die anders is dan de vorige
            if (fridayMonth !== getMonth(lastMonthDate)) {
                weekOptie.maandNaam = '';

                // als de 'vanaf' datum in een andere maand ligt dan de huidige, toon de eerste week dan ook de naam van de 'vanaf' maand
                if (weekIndex === 0 && !fromWeekIsThisMonth && getMonth(fromWeekMonday) !== fridayMonth) {
                    weekOptie.maandNaam += upperFirst(formatDateNL(fromWeekMonday, 'maand_uitgeschreven'));

                    const fromDateYear = getYear(fromWeekMonday);
                    if (fromDateYear !== fridayYear) {
                        // de nieuwe maand is in een nieuw jaar, dus toon ook het huidige jaar
                        weekOptie.maandNaam += ` ${fromDateYear}`;
                    }
                    weekOptie.maandNaam += ' en ';
                }

                // eerste maand met een hoofdletter
                if (weekOptie.maandNaam.length === 0) {
                    weekOptie.maandNaam += upperFirst(formatDateNL(friday, 'maand_uitgeschreven'));
                } else {
                    weekOptie.maandNaam += formatDateNL(friday, 'maand_uitgeschreven');
                }

                if (fridayYear !== getYear(lastMonthDate)) {
                    // de nieuwe maand is in een nieuw jaar, dus toon ook het nieuwe jaar
                    weekOptie.maandNaam += ` ${fridayYear}`;
                }

                lastMonthDate = friday;
            }
        }

        weekOpties.push(weekOptie);
    }

    return weekOpties;
}

export function createDagOptie(day: Date, fromDate: Date): DagOptie {
    return {
        dagNaam: formatDateNL(day, 'dag_kort'),
        dagNummer: getDate(day),
        date: day,
        disabled: isBefore(day, fromDate),
        heleDag: true
    };
}

export function createTijdOptie(hours: number, minutes: number): TijdOptie {
    const text = padStart(`${hours}`, 2, '0') + ':' + padStart(`${minutes}`, 2, '0');
    const value = hours * 100 + minutes;
    return {
        disabled: false,
        hours,
        minutes,
        text,
        numericValue: value
    };
}

export function createTijdOpties(disabledBefore?: TijdOptie): TijdOptie[] {
    // tijd opties van 07:00 tot 19:00 uur
    return range(7, 19.5, 0.5).map((numeric) => {
        const hours = Math.floor(numeric);
        const minutes = numeric % 1 === 0 ? 0 : 30;
        const tijdOptie = createTijdOptie(hours, minutes);
        if (disabledBefore && tijdOptie.numericValue < disabledBefore.numericValue) {
            tijdOptie.disabled = true;
        }
        return tijdOptie;
    });
}

export function createInitialSelectedTijdOptie(now: Date): TijdOptie {
    // Eerst volgende keuze t.o.v. huidige tijd (ie: 11:52 = 12:00, 14:31 = 15:00 en 09:04 = 09:30)
    const hours = getHours(now);
    const minutes = getMinutes(now);
    let selectedHours = hours;
    let selectedMinutes = minutes;
    if (selectedMinutes > 0) {
        if (selectedMinutes < 30) {
            selectedMinutes = 30;
        } else if (selectedMinutes > 30) {
            selectedMinutes = 0;
            selectedHours++;
        }
    }
    if (selectedHours < 7) {
        selectedHours = 7;
        selectedMinutes = 0;
    }
    if (selectedHours > 19 || (selectedHours === 19 && selectedMinutes > 0)) {
        selectedHours = 19;
        selectedMinutes = 0;
    }
    return createTijdOptie(selectedHours, selectedMinutes);
}
