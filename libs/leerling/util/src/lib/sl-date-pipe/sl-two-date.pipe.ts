import { Pipe, PipeTransform } from '@angular/core';

import { capitalize, formatNL, removePeriod } from './sl-date-util';

@Pipe({ name: 'slTwoDate', standalone: true })
export class SlTwoDatePipe implements PipeTransform {
    transform(startDate: Date | undefined, endDate: Date | undefined, withDayName: boolean) {
        if (!startDate || !endDate) {
            return '';
        }
        if (startDate?.getMonth() === endDate?.getMonth()) {
            return capitalize(
                `${formatNL(startDate, (withDayName ? 'eeeeee ' : '') + 'd')} t/m ${removePeriod(formatNL(endDate, (withDayName ? 'eeeeee ' : '') + 'd MMM'))}`
            );
        }
        return capitalize(
            `${removePeriod(formatNL(startDate, (withDayName ? 'eeeeee ' : '') + 'd MMM'))} t/m ${removePeriod(formatNL(endDate, (withDayName ? 'eeeeee ' : '') + 'd MMM'))}`
        );
    }
}
