import { RMaatregel, RMaatregelToekenning } from 'leerling-codegen';
import { SAbsentieMelding, mapAbsentieMelding } from '../absentie/absentie-model';
import { assertIsDefined } from '../util/asserts';
import { toLocalDateTime } from '../util/date-util';
import { SEntiteit, getEntiteitId } from '../util/entiteit-model';

export function mapMaatregelToekenning(toekenning: RMaatregelToekenning): SMaatregelToekenning {
    assertIsDefined(toekenning.maatregelDatum);
    assertIsDefined(toekenning.maatregel);

    return {
        id: getEntiteitId(toekenning),
        maatregelDatum: toLocalDateTime(toekenning.maatregelDatum),
        opmerkingen: toekenning.opmerkingen,
        nagekomen: Boolean(toekenning.nagekomen),
        automatischToegekend: Boolean(toekenning.automatischToegekend),
        maatregel: mapMaatregel(toekenning.maatregel),
        veroorzaaktDoor: toekenning.veroorzaaktDoor ? mapAbsentieMelding(toekenning.veroorzaaktDoor) : undefined
    };
}

export function mapMaatregel(maatregel: RMaatregel): SMaatregel {
    return {
        id: getEntiteitId(maatregel),
        omschrijving: maatregel.omschrijving ?? ''
    };
}
export interface SMaatregelenState {
    actieveMaatregelen: SMaatregelToekenning[] | undefined;
}

export interface SMaatregelToekenning extends SEntiteit {
    maatregelDatum: Date;
    opmerkingen: string | undefined;
    nagekomen: boolean;
    automatischToegekend: boolean;
    maatregel: SMaatregel;
    veroorzaaktDoor: SAbsentieMelding | undefined;
}

export interface SMaatregel extends SEntiteit {
    omschrijving: string;
}
