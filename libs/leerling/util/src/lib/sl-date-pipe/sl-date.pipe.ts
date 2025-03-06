import { Pipe, PipeTransform } from '@angular/core';
import { formatDateNL } from './sl-date-util';

export type DateFormat =
    /** voorbeeld: '05:00' of '19:00' */
    | 'tijd'

    /** voorbeeld: '5:00' */
    | 'tijd_zonder_voorloop'

    /** voorbeeld: '2023' */
    | 'jaar'

    /** voorbeeld: 'Week 21' / 'Week 21, 2023' */
    | 'week'

    /** 13 */
    | 'dagnummer'

    /** voorbeeld: 'Wo' */
    | 'dag_kort'

    /** voorbeeld: 'Week 21, maandag, 09:00' / 'Week 21, 2023, maandag, 09:00' */
    | 'week_dag_tijd'

    /** voorbeeld: 'Wo 19 */
    | 'dag_kort_dagnummer'

    /** voorbeeld: '19 aug' / '19 aug, 2023 */
    | 'dagnummer_maand_kort'

    /** voorbeeld: '19 aug' */
    | 'dagnummer_maand_kort_zonder_jaar'

    /** voorbeeld: '19 augustus' */
    | 'dagnummer_maand_lang_zonder_jaar'

    /** voorbeeld: 'Wo 19 aug' / 'Wo 19 aug, 2023' / 'Vandaag 19 aug' */
    | 'dag_kort_dagnummer_maand_kort'

    /** voorbeeld: 'wo 19 aug' / 'wo 19 aug, 2023' / 'vandaag 19 aug' */
    | 'dag_kort_dagnummer_maand_kort_lowercase'

    /** voorbeeld: '19 april 09:00' */
    | 'dagnummer_maand_lang_tijd_lowercase'

    /** voorbeeld: 'Woensdag 19 augustus' / 'Woensdag 19 augustus, 2023' / 'Vandaag 19 augustus' */
    | 'dag_uitgeschreven_dagnummer_maand'

    /** voorbeeld: 'Woensdag 19 aug' / 'Woensdag 19 aug, 2023' / 'Vandaag 19 aug' */
    | 'dag_uitgeschreven_dagnummer_maand_kort'

    /** voorbeeld: 'Wo 19 aug, 19:00' / 'Wo 19 aug, 2023, 19:00' / 'Vandaag 19 aug, 19:00' */
    | 'dag_kort_dagnummer_maand_kort_tijd'

    /** voorbeeld: 'Wo 19 aug 19:00'*/
    | 'dag_kort_dagnummer_maand_kort_tijd_zonder_komma'

    /** voorbeeld: 'wo 19 aug, 19:00' / 'wo 19 aug, 2023, 19:00' / vandaag 19 aug, 19:00' */
    | 'dag_kort_dagnummer_maand_kort_tijd_lowercase'

    /** voorbeeld: 'Woensdag 19 augustus, 19:00' / 'Woensdag 19 augustus, 2023, 19:00' / 'Vandaag 19 augustus, 19:00' */
    | 'dag_uitgeschreven_dagnummer_maand_tijd'

    /** voorbeeld: '1 t/m 5 jul' / '29 jan t/m 2 feb' */
    | 'week_begin_dag_tm_eind_dag_maand_kort'

    /** voorbeeld: '1 tot en met 5 juli' / '29 jan tot en met 2 februari' */
    | 'week_begin_dag_totenmet_eind_dag_maand_lang'

    /** voorbeeld: 'januari' / 'augustus' */
    | 'maand_uitgeschreven';

@Pipe({ name: 'slDate', standalone: true })
export class SlDatePipe implements PipeTransform {
    transform(date: Date | undefined, _format: DateFormat) {
        return date ? formatDateNL(date, _format) : '';
    }
}
