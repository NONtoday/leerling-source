import { addDays, differenceInCalendarDays } from 'date-fns';
import { isPresent } from 'harmony';
import {
    RInleverperiode,
    RLeerlingPrimer,
    RLeerlingProjectgroep,
    RLesgroep,
    RStudiewijzerItem,
    RToetsSoort,
    RswiAfspraakToekenning,
    RswiDagToekenning,
    RswiGemaakt,
    RswiToekenning,
    RswiWeekToekenning
} from 'leerling-codegen';
import { sortBy } from 'lodash-es';
import { SBijlage, SExternmateriaal } from '../bijlage/bijlage-model';
import { mapExternMateriaal, mapStudieBijlage } from '../bijlage/bijlage-util';
import { getMaandagVanJaarWeek, toLocalDateTime } from '../util/date-util';
import { DEFAULT_BOOLEAN, DEFAULT_NUMBER, DEFAULT_STRING, SEntiteit, getEntiteitId } from '../util/entiteit-model';
import { SVak, mapOptionalVak } from '../vakkeuze/vakkeuze-model';

export const ADDITIONAL_LEERLINGEN = 'leerlingen';
export const ADDITIONAL_GEMAAKT = 'swigemaaktVinkjes';
export const ADDITIONAL_LESGROEP = 'lesgroep';
export const ADDITIONAL_LEERLINGEN_MET_INLEVERINGEN = 'leerlingenMetInlevering';
export const ADDITIONAL_LEERLING_PROJECTGROEP = 'leerlingProjectgroep';
export const ADDITIONAL_STUDIEWIJZER_ID = 'studiewijzerId';

export type HuiswerkType = 'LESSTOF' | 'HUISWERK' | 'TOETS' | 'GROTE_TOETS';

export type SwiToekenningType = 'DAG' | 'AFSPRAAK' | 'WEEK';

export interface SToetssoort extends SEntiteit {
    naam: string;
}

export interface SProjectgroep {
    naam: string;
    leerlingen: string[];
}

export interface SLesgroep extends SEntiteit {
    naam: string;
    omschrijving?: string;
    uuid: string;
}

export interface SInlevermoment {
    id: number;
    start: Date;
    eind: Date;
}

export interface SStudiewijzerItem extends SEntiteit {
    studiewijzerId: number;
    toekenningId: number;
    swiToekenningType: SwiToekenningType;
    onderwerp?: string;
    huiswerkType: HuiswerkType;
    omschrijving: string;
    toetsSoort?: SToetssoort;
    inleverperiodes: boolean;
    lesmateriaal: boolean;
    projectgroep: SProjectgroep | undefined;
    lesgroep?: SLesgroep;
    vak: SVak | undefined;
    bijlagen: SBijlage[];
    externeMaterialen: SExternmateriaal[];
    notitie?: string;
    tijdsindicatie?: string;
    leerdoelen?: string;
    sortering: number;
    gemaakt: boolean;
    isInleveropdracht: boolean;
    inlevermoment: SInlevermoment | undefined;
    heeftInlevering: boolean;
    datumTijd: Date;
}

export interface SSWIDag {
    datum: Date;
    items: SStudiewijzerItem[];
}

export interface SSWIWeek {
    jaarWeek: string;
    weekitems: SStudiewijzerItem[];
    dagen: SSWIDag[];
}

export interface SSWIModel {
    jaarWeken: SSWIWeek[] | undefined;
}

export function createSWIWeek(
    jaarWeek: string,
    leerlingId: number,
    afspraakToekenningen: RswiAfspraakToekenning[],
    dagToekenningen: RswiDagToekenning[],
    weekToekenningen: RswiWeekToekenning[]
): SSWIWeek {
    const maandag = getMaandagVanJaarWeek(jaarWeek);
    const swiDagen = createEmptySWIDagen(maandag);

    const toekenningFilter = (toekenning: RswiToekenning): boolean =>
        toekenning.studiewijzerItem &&
        toekenning.additionalObjects?.[ADDITIONAL_LEERLINGEN]?.items.find(
            (leerling: RLeerlingPrimer) => getEntiteitId(leerling) === leerlingId
        );

    afspraakToekenningen.filter(toekenningFilter).forEach((afspraakToekenning) => {
        const huiswerk = mapDatumStudiewijzerItem(leerlingId, 'AFSPRAAK', afspraakToekenning);
        const dagIndex = differenceInCalendarDays(toLocalDateTime(afspraakToekenning.datumTijd ?? ''), maandag);
        swiDagen[dagIndex].items.push(huiswerk);
    });

    dagToekenningen.filter(toekenningFilter).forEach((dagToekenning) => {
        const huiswerk = mapDatumStudiewijzerItem(leerlingId, 'DAG', dagToekenning);
        const dagIndex = differenceInCalendarDays(toLocalDateTime(dagToekenning.datumTijd ?? ''), maandag);
        swiDagen[dagIndex].items.push(huiswerk);
    });

    const maandagJaarWeek = getMaandagVanJaarWeek(jaarWeek);
    const weekItems: SStudiewijzerItem[] = [];
    weekToekenningen.filter(toekenningFilter).forEach((weekToekenning) => {
        weekItems.push(mapStudiewijzerItem(leerlingId, 'WEEK', weekToekenning, maandagJaarWeek));
    });

    return {
        jaarWeek: jaarWeek,
        weekitems: weekItems,
        dagen: swiDagen
    };
}

/**
 * Maakt een lijst van 7 SWIDagen voor alle dagen in de week vanaf maandag
 * @param maandag
 * @returns
 */
function createEmptySWIDagen(maandag: Date): SSWIDag[] {
    let currentDate = maandag;

    const swiDagen: SSWIDag[] = [];
    for (let i = 0; i < 7; i++) {
        swiDagen.push({ datum: currentDate, items: [] });
        currentDate = addDays(currentDate, 1);
    }

    return swiDagen;
}

function mapDatumStudiewijzerItem(
    leerlingId: number,
    swiToekenningType: SwiToekenningType,
    rSwiAfspraakToekenning: RswiAfspraakToekenning | RswiDagToekenning
): SStudiewijzerItem {
    return mapStudiewijzerItem(
        leerlingId,
        swiToekenningType,
        rSwiAfspraakToekenning,
        toLocalDateTime(rSwiAfspraakToekenning.datumTijd ?? '')
    );
}

function mapInlevermoment(inleverperiodes: RInleverperiode[] | undefined): SInlevermoment | undefined {
    const inlevermoment = inleverperiodes?.[0];
    if (!inlevermoment) return undefined;

    return {
        id: getEntiteitId(inlevermoment),
        start: toLocalDateTime(inlevermoment.startGeldigheid ?? ''),
        eind: toLocalDateTime(inlevermoment.eindGeldigheid ?? '')
    };
}

function mapStudiewijzerItem(
    leerlingId: number,
    swiToekenningType: SwiToekenningType,
    swiToekenning: RswiToekenning,
    datum: Date
): SStudiewijzerItem {
    const swiGemaakt =
        ((swiToekenning.additionalObjects?.[ADDITIONAL_GEMAAKT]?.items as RswiGemaakt[]) ?? []).find((swiGemaakt) => {
            const leerling = swiGemaakt.leerling;
            if (!leerling) return false;
            return getEntiteitId(leerling) === leerlingId;
        })?.gemaakt ?? false;

    const basicStudiewijzerItem = mapBasicStudiewijzerItem(swiToekenningType, swiToekenning, datum);
    return {
        ...basicStudiewijzerItem,
        projectgroep: mapProjectgroep(leerlingId, swiToekenning.additionalObjects?.[ADDITIONAL_LEERLING_PROJECTGROEP]?.items),
        gemaakt: swiGemaakt,
        heeftInlevering: basicStudiewijzerItem.isInleveropdracht ? heeftInlevering(leerlingId, swiToekenning) : false
    };
}

export function mapBasicStudiewijzerItem(
    swiToekenningType: SwiToekenningType,
    swiToekenning: RswiToekenning,
    datum: Date
): SStudiewijzerItem {
    const studiewijzerItem: RStudiewijzerItem = swiToekenning.studiewijzerItem ?? {};
    const lesgroep = swiToekenning.additionalObjects?.['lesgroep'] as RLesgroep;

    const inlevermoment = mapInlevermoment(studiewijzerItem.inlevermomenten);
    const isInleveropdracht = Boolean(inlevermoment);
    return {
        id: getEntiteitId(studiewijzerItem),
        studiewijzerId: swiToekenning.additionalObjects?.[ADDITIONAL_STUDIEWIJZER_ID],
        toekenningId: getEntiteitId(swiToekenning),
        swiToekenningType: swiToekenningType,
        sortering: swiToekenning.sortering ?? DEFAULT_NUMBER,
        onderwerp: studiewijzerItem.onderwerp,
        huiswerkType: studiewijzerItem.huiswerkType ?? 'HUISWERK',
        omschrijving: studiewijzerItem.omschrijving ?? DEFAULT_STRING,
        toetsSoort: studiewijzerItem.toetsSoort ? mapToetsSoort(studiewijzerItem.toetsSoort) : undefined,
        inleverperiodes: studiewijzerItem.inleverperiodes ?? DEFAULT_BOOLEAN,
        lesmateriaal: studiewijzerItem.lesmateriaal ?? DEFAULT_BOOLEAN,
        projectgroep: undefined,
        lesgroep: mapLesgroep(lesgroep),
        vak: lesgroep ? mapOptionalVak(lesgroep.vak) : undefined,
        bijlagen: studiewijzerItem.bijlagen?.map(mapStudieBijlage).filter(isPresent) ?? [],
        externeMaterialen:
            studiewijzerItem.externeMaterialen?.map((externMateriaal) => mapExternMateriaal(externMateriaal)).filter(isPresent) ?? [],
        inlevermoment: inlevermoment,
        notitie: studiewijzerItem.notitie,
        tijdsindicatie: studiewijzerItem.tijdsindicatie,
        leerdoelen: studiewijzerItem.leerdoelen,
        gemaakt: false,
        isInleveropdracht,
        heeftInlevering: false,
        datumTijd: datum
    };
}

function mapLesgroep(rLesgroep?: RLesgroep): SLesgroep | undefined {
    if (!rLesgroep) return undefined;

    return {
        id: getEntiteitId(rLesgroep),
        naam: rLesgroep.naam ?? DEFAULT_STRING,
        omschrijving: rLesgroep.omschrijving,
        uuid: rLesgroep.UUID ?? DEFAULT_STRING
    };
}

function mapProjectgroep(leerlingId: number, projectgroepen: RLeerlingProjectgroep[] | undefined): SProjectgroep | undefined {
    const groep = projectgroepen?.find((groep) => groep.leerling && getEntiteitId(groep.leerling) === leerlingId);
    return groep
        ? {
              naam: groep.projectgroepnaam ?? '-',
              leerlingen: sortBy(groep.projectgroepLeerlingen, (naam) => naam.toLowerCase())
          }
        : undefined;
}

function heeftInlevering(leerlingId: number, toekenning: RswiToekenning): boolean {
    return toekenning.additionalObjects?.[ADDITIONAL_LEERLINGEN_MET_INLEVERINGEN]?.values?.includes(leerlingId) ?? false;
}

function mapToetsSoort(toetsSoort: RToetsSoort): SToetssoort {
    return {
        id: getEntiteitId(toetsSoort),
        naam: toetsSoort.naam ?? DEFAULT_STRING
    };
}
