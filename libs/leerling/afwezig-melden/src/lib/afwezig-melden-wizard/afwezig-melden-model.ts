import { addDays, addWeeks, getDate, getMonth, getYear, isAfter, isBefore, isMonday, isSameDay, previousMonday, subDays } from 'date-fns';
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
    ariaLabel: string;
    dagNaam: string;
    dagNummer: number;
    date: Date;
    disabled: boolean;
    isRangeOptie: boolean;
    selected: boolean;
}

export interface TijdOptieMinuten {
    disabled: boolean;
    minuten: number;
    text: string;
}

export interface TijdOptieUren {
    disabled: boolean;
    uren: number;
    text: string;
}

const NumBusinessDays = 5;

interface CreateWeekOptiesInput {
    now: Date;
    rangeStart?: Date;
    selected?: Date;
    showWeken: number;
    startDate: Date;
}

export function createWeekOpties(input: CreateWeekOptiesInput): WeekOptie[] {
    const { startDate, now, rangeStart, selected, showWeken } = input;
    const thisWeekMonday = isMonday(now) ? now : previousMonday(now);
    const startWeekMonday = isMonday(startDate) ? startDate : previousMonday(startDate);
    const startWeekIsThisMonth = getMonth(startWeekMonday) === getMonth(thisWeekMonday);
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
            const day = addDays(addWeeks(startWeekMonday, weekIndex), dayIndex);

            // begin- of einddatum, afhankelijk van modus
            const isSelected: boolean = !!selected && isSameDay(day, selected);

            // indicatie voor een dagoptie tussen de begin- en einddatum, of de begindatum als er geen einddatum geselecteerd is
            let isRangeOptie = false;
            if (rangeStart) {
                if (selected) {
                    isRangeOptie = isAfter(day, subDays(rangeStart, 1)) && isBefore(day, selected);
                }
            }

            weekOptie.dagOpties.push(createDagOptie(day, startDate, isRangeOptie, isSelected));

            // "It's Friday, Friday / Gotta get down on Friday" 🎶
            if (dayIndex === NumBusinessDays - 1) {
                friday = day;
            }
        }

        // laatste dag van de week: kijk of er een indicatie moet komen voor de naam van de maand
        if (friday) {
            const fridayMonth = getMonth(friday);
            const fridayYear = getYear(friday);

            // geef de naam van de maand aan als die anders is dan de vorige
            if (fridayMonth !== getMonth(lastMonthDate)) {
                weekOptie.maandNaam = '';

                // als de 'vanaf' datum in een andere maand ligt dan de huidige, toon de eerste week dan ook de naam van de 'vanaf' maand
                if (weekIndex === 0 && !startWeekIsThisMonth && getMonth(startWeekMonday) !== fridayMonth) {
                    weekOptie.maandNaam += upperFirst(formatDateNL(startWeekMonday, 'maand_uitgeschreven'));

                    const startDateYear = getYear(startWeekMonday);
                    if (startDateYear !== fridayYear) {
                        // de nieuwe maand is in een nieuw jaar, dus toon ook het huidige jaar
                        weekOptie.maandNaam += ` ${startDateYear}`;
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

export function createDagOptie(day: Date, startDate: Date, isRangeOptie = false, selected = false): DagOptie {
    const disabled = isBefore(day, startDate);

    let ariaLabel = formatDateNL(day, 'dag_uitgeschreven_dagnummer_maand');
    if (selected) {
        ariaLabel += ' is geselecteerd';
    } else if (disabled) {
        ariaLabel += ' niet selecteerbaar';
    }

    return {
        ariaLabel,
        dagNaam: formatDateNL(day, 'dag_kort'),
        dagNummer: getDate(day),
        date: day,
        disabled,
        isRangeOptie,
        selected
    };
}

function formatTijdText(value: number): string {
    return padStart(`${value}`, 2, '0');
}

export function createTijdOptieMinuten(minuten: number, disabled = false): TijdOptieMinuten {
    return {
        minuten,
        text: formatTijdText(minuten),
        disabled
    };
}

export function createTijdOptiesMinuten(disabledBefore?: number): TijdOptieMinuten[] {
    // minuten van 00:00 t/m 00:55 (excl. 60)
    return range(0, 60, 5).map((minuten) => {
        return {
            minuten,
            text: formatTijdText(minuten),
            disabled: !!disabledBefore && minuten < disabledBefore
        };
    });
}

export function createTijdOptieUren(uren: number, disabled = false): TijdOptieUren {
    return {
        uren,
        text: formatTijdText(uren),
        disabled
    };
}

export function createTijdOptiesUren(disabledBeforeHours?: number): TijdOptieUren[] {
    // uren van 07:00 t/m 19:00 (excl. 20)
    return range(7, 20).map((uren) => {
        return createTijdOptieUren(uren, !!disabledBeforeHours && uren < disabledBeforeHours);
    });
}
