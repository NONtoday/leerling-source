import { REloRestricties } from 'leerling-codegen';
import { AFWEZIG_MELDEN, BERICHTEN, CIJFERS, ROOSTER, STUDIEWIJZER } from './router.service';

const pathWithRestictionNames = [ROOSTER, STUDIEWIJZER, AFWEZIG_MELDEN, BERICHTEN, CIJFERS] as const;
export type PathWithRestrictionName = (typeof pathWithRestictionNames)[number];

export function getRestriction(pathWithRestrictionName: PathWithRestrictionName): keyof REloRestricties {
    switch (pathWithRestrictionName) {
        case ROOSTER:
            return 'roosterBekijkenAan';
        case STUDIEWIJZER:
            return 'huiswerkBekijkenAan';
        case AFWEZIG_MELDEN:
            return 'absentiesBekijkenAan';
        case BERICHTEN:
            return 'berichtenBekijkenAan';
        case CIJFERS:
            return 'cijfersBekijkenAan';
    }
}

export function getRestrictionFromPath(path: string): keyof REloRestricties | undefined {
    const pathWithRestrictionName = pathWithRestictionNames.find((pathWithRestrictionName) => path.includes(pathWithRestrictionName));
    if (!pathWithRestrictionName) {
        return undefined;
    }

    return getRestriction(pathWithRestrictionName);
}
