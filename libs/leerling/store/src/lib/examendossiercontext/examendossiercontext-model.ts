import { RExamendossierContext } from 'leerling-codegen';
import { DEFAULT_STRING } from '../util/entiteit-model';

export interface SExamendossierContext {
    examenjaar: number;
    lichtingUuid: string | undefined;
    onderwijssoort: string;
    plaatsingUuid: string;
}

export interface SExamendossierContextModel {
    contexten: SExamendossierContext[] | undefined;
}

export function mapRExamendossierContext(rExamendossierContext: RExamendossierContext): SExamendossierContext {
    return {
        examenjaar: rExamendossierContext.examenjaar ?? -1,
        lichtingUuid: rExamendossierContext.lichtingUUID,
        onderwijssoort: rExamendossierContext.onderwijssoort ?? DEFAULT_STRING,
        plaatsingUuid: rExamendossierContext.plaatsingUUID ?? DEFAULT_STRING
    };
}
