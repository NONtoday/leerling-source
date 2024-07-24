import { format, getDay, isDate, isFriday, isMonday, isSameDay, isSameYear, nextFriday, parseISO, previousMonday } from 'date-fns';
import { nl } from 'date-fns/locale';
import { DateFormat } from './sl-date.pipe';

export const formatDateNL = (date: Date, format: DateFormat) => {
    switch (format) {
        case 'tijd':
            return formatNL(date, 'HH:mm');
        case 'tijd_zonder_voorloop':
            return formatNL(date, 'H:mm');
        case 'jaar':
            return formatNL(date, 'yyyy');
        case 'week':
            return `Week ${formatNL(date, isSameYear(date, new Date()) ? 'w' : 'w, yyyy')}`;
        case 'dagnummer':
            return formatNL(date, 'd');
        case 'dag_kort':
            return capitalize(formatNL(date, 'eeeeee'));
        case 'week_dag_tijd':
            return `Week ${formatNL(date, isSameYear(date, new Date()) ? 'w, EEEE, HH:mm' : 'w, yyyy, EEEE, HH:mm')}`;
        case 'dag_kort_dagnummer':
            return capitalize(formatNL(date, 'eeeeee d'));
        case 'dagnummer_maand_kort':
            return removePeriod(formatNL(date, isSameYear(date, new Date()) ? 'd MMM' : 'd MMM, yyyy'));
        case 'dagnummer_maand_kort_zonder_jaar':
            return removePeriod(formatNL(date, 'd MMM'));
        case 'dagnummer_maand_lang_zonder_jaar':
            return removePeriod(formatNL(date, 'd MMMM'));
        case 'dag_kort_dagnummer_maand_kort': {
            if (isSameDay(date, new Date())) {
                return `Vandaag ${removePeriod(formatNL(date, 'd MMM'))}`;
            }
            return capitalize(removePeriod(formatNL(date, isSameYear(date, new Date()) ? 'eeeeee d MMM' : 'eeeeee d MMM, yyyy')));
        }
        case 'dag_kort_dagnummer_maand_kort_lowercase': {
            if (isSameDay(date, new Date())) {
                return `vandaag ${removePeriod(formatNL(date, 'd MMM'))}`;
            }
            return removePeriod(formatNL(date, isSameYear(date, new Date()) ? 'eeeeee d MMM' : 'eeeeee d MMM, yyyy'));
        }
        case 'dagnummer_maand_lang_tijd_lowercase': {
            return formatNL(date, 'd MMMM HH:mm');
        }
        case 'dag_uitgeschreven_dagnummer_maand': {
            if (isSameDay(date, new Date())) {
                return `Vandaag ${formatNL(date, 'd MMMM')}`;
            }
            return capitalize(formatNL(date, isSameYear(date, new Date()) ? 'EEEE d MMMM' : 'EEEE d MMMM, yyyy'));
        }
        case 'dag_uitgeschreven_dagnummer_maand_kort': {
            if (isSameDay(date, new Date())) {
                return `Vandaag ${removePeriod(formatNL(date, 'd MMM'))}`;
            }
            return capitalize(removePeriod(formatNL(date, isSameYear(date, new Date()) ? 'EEEE d MMM' : 'EEEE d MMM, yyyy')));
        }
        case 'dag_kort_dagnummer_maand_kort_tijd': {
            if (isSameDay(date, new Date())) {
                return `Vandaag ${removePeriod(formatNL(date, 'd MMM, HH:mm'))}`;
            }
            return capitalize(
                removePeriod(formatNL(date, isSameYear(date, new Date()) ? 'eeeeee d MMM, HH:mm' : 'eeeeee d MMM, yyyy, HH:mm'))
            );
        }
        case 'dag_kort_dagnummer_maand_kort_tijd_lowercase': {
            if (isSameDay(date, new Date())) {
                return `vandaag ${removePeriod(formatNL(date, 'd MMM, HH:mm'))}`;
            }
            return removePeriod(formatNL(date, isSameYear(date, new Date()) ? 'eeeeee d MMM, HH:mm' : 'eeeeee d MMM, yyyy, HH:mm'));
        }
        case 'dag_uitgeschreven_dagnummer_maand_tijd': {
            if (isSameDay(date, new Date())) {
                return `Vandaag ${formatNL(date, 'd MMMM, HH:mm')}`;
            }
            return capitalize(formatNL(date, isSameYear(date, new Date()) ? 'EEEE d MMMM, HH:mm' : 'EEEE d MMMM, yyyy, HH:mm'));
        }
        case 'week_begin_dag_tm_eind_dag_maand_kort': {
            const monday = isMonday(date) ? date : previousMonday(date);
            const friday = isFriday(date) ? date : nextFriday(date);
            if (monday.getMonth() === friday.getMonth()) {
                return `${formatNL(monday, 'd')} t/m ${removePeriod(formatNL(friday, 'd MMM'))}`;
            }
            return `${removePeriod(formatNL(monday, 'd MMM'))} t/m ${removePeriod(formatNL(friday, 'd MMM'))}`;
        }
        case 'week_begin_dag_totenmet_eind_dag_maand_lang': {
            const monday = isMonday(date) ? date : previousMonday(date);
            const friday = isFriday(date) ? date : nextFriday(date);
            if (monday.getMonth() === friday.getMonth()) {
                return `${formatNL(monday, 'd')} tot en met ${removePeriod(formatNL(friday, 'd MMMM'))}`;
            }
            return `${removePeriod(formatNL(monday, 'd MMMM'))} tot en met ${removePeriod(formatNL(friday, 'd MMMM'))}`;
        }
        case 'maand_uitgeschreven':
            return formatNL(date, 'MMMM');
        default:
            return 'Onbekend format';
    }
};

export const formatBeginEindTijd = (begin: Date, eind?: Date) => {
    let tijdsindicatie = formatDateNL(begin, 'tijd');
    if (eind) {
        tijdsindicatie += ` - ${formatDateNL(eind, 'tijd')}`;
    }
    return tijdsindicatie;
};

export const isWeekend = (date: Date) => {
    const dayOfWeek = getDay(date);
    return dayOfWeek === 0 || dayOfWeek === 6;
};

export const capitalize = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1);
export const removePeriod = (string: string): string => string.replace('.', '');

export const formatNL = (date: Date, _format: string): string => {
    let dateToFormat = date;
    if (!isDate(dateToFormat)) {
        dateToFormat = parseISO(date as unknown as string);
    }
    return format(dateToFormat, _format, { locale: nl });
};
