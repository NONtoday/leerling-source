import { parseISO } from 'date-fns';
import { isPresent } from 'harmony';
import {
    REduRoutePortalUserProduct,
    RLeermiddelKeuze,
    RLeermiddelMethode,
    RMethodeInformatie,
    RStudieMateriaal,
    RStudiewijzer,
    RStudiewijzerJaarBijlage,
    RStudiewijzerJaarBijlageMap,
    RStudiewijzerJaarExternMateriaal,
    RswiAfspraakToekenning,
    RswiDagToekenning,
    RswiToekenning,
    RswiWeekToekenning
} from 'leerling-codegen';
import { SBijlage, SExternmateriaal } from '../bijlage/bijlage-model';
import { mapAfspraakBijlage, mapExternMateriaal, mapStudiewijzer } from '../bijlage/bijlage-util';
import { SStudiewijzerItem, SwiToekenningType, mapBasicStudiewijzerItem } from '../huiswerk/huiswerk-model';
import { getMaandagVanWeeknummerBinnenHuidigSchooljaar } from '../util/date-util';
import { DEFAULT_STRING, SEntiteit, getEntiteitId, getType } from '../util/entiteit-model';
import { SVak } from '../vakkeuze/vakkeuze-model';

export interface SJaarbijlageMap extends SEntiteit {
    naam: string;
    sortering: number;
}

export interface SJaarbijlage extends SBijlage {
    map: SJaarbijlageMap | undefined;
}

export interface SJaarExternMateriaal extends SExternmateriaal {
    map: SJaarbijlageMap | undefined;
}

export interface SStudiemateriaalModel {
    studiemateriaal: SStudiemateriaal[] | undefined;
    eduRoutePortalProducts: SLeermiddel[] | undefined;
    vakkenMetStudiemateriaal: SVak[] | undefined;
}

export interface SMethodeInfomatie {
    uuid: string;
    methode: string;
    uitgever: string;
}

export type LeermiddelType = 'PERSOONLIJK' | 'INTERN_BOEKENFONDS';

export interface SLeermiddel extends SEntiteit {
    titel: string;
    url: string;
    leermiddelUuid: string;
    uuid: string;
    type: LeermiddelType;
    methodeInformatie?: SMethodeInfomatie;
}

export interface SStudiemateriaal {
    vakOfLesgroepUuid: string;
    lesstof: SStudiewijzerItem[];
    jaarbijlagenMappen: SJaarbijlageMap[];
    jaarbijlagen: SJaarbijlage[];
    externMateriaal: SJaarExternMateriaal[];
    leermiddelen: SLeermiddel[];
}

export function mapEduRoutePortalUserProducts(rEduRoutePortalUserProcuct: REduRoutePortalUserProduct): SLeermiddel {
    return {
        id: getEntiteitId(rEduRoutePortalUserProcuct),
        leermiddelUuid: rEduRoutePortalUserProcuct.product?.UUID ?? DEFAULT_STRING,
        uuid: rEduRoutePortalUserProcuct.UUID ?? DEFAULT_STRING,
        titel: rEduRoutePortalUserProcuct.product?.title ?? DEFAULT_STRING,
        url: rEduRoutePortalUserProcuct.product?.url ?? DEFAULT_STRING,
        type: 'PERSOONLIJK',
        methodeInformatie: mapMethodeInformatie(rEduRoutePortalUserProcuct.product?.methodeInformatie)
    };
}

export function mapStudiemateriaal(vakOfLesgroepUuid: string, rStudieMateriaal: RStudieMateriaal): SStudiemateriaal {
    return {
        vakOfLesgroepUuid: vakOfLesgroepUuid,
        lesstof: mapLesstof(rStudieMateriaal.lesstof?.filter((ls) => !!ls.studiewijzerItem)),
        jaarbijlagenMappen: mapJaarbijlagenMappen(rStudieMateriaal.jaarBijlagenMappen),
        jaarbijlagen: mapJaarbijlagen(rStudieMateriaal.jaarBijlagen),
        externMateriaal: mapJaarExternMateriaal(rStudieMateriaal.externMateriaal),
        leermiddelen: mapLeermiddelen(rStudieMateriaal.leermiddelKeuzes)
    };
}

function mapLesstof(
    rToekenningen?: Array<RswiAfspraakToekenning | RswiDagToekenning | RswiToekenning | RswiWeekToekenning>
): SStudiewijzerItem[] {
    if (!rToekenningen || rToekenningen.length === 0) return [];

    return rToekenningen
        .map((rToekenning) => {
            let swiToekenningType: SwiToekenningType | undefined;
            let datum: Date | undefined;
            if (getType(rToekenning) === 'studiewijzer.RSWIDagToekenning') {
                swiToekenningType = 'DAG';
                datum = parseISO((rToekenning as RswiDagToekenning).datumTijd ?? '');
            } else if (getType(rToekenning) === 'studiewijzer.RSWIAfspraakToekenning') {
                swiToekenningType = 'AFSPRAAK';
                datum = parseISO((rToekenning as RswiAfspraakToekenning).datumTijd ?? '');
            } else if (getType(rToekenning) === 'studiewijzer.RSWIWeekToekenning') {
                swiToekenningType = 'WEEK';
                datum = getMaandagVanWeeknummerBinnenHuidigSchooljaar((rToekenning as RswiWeekToekenning).weeknummerVanaf);
            }

            if (swiToekenningType && datum) {
                return mapBasicStudiewijzerItem(swiToekenningType, rToekenning, datum);
            } else {
                return undefined;
            }
        })
        .filter(isPresent);
}

function mapJaarbijlagenMappen(rMappen?: Array<RStudiewijzerJaarBijlageMap>): SJaarbijlageMap[] {
    if (!rMappen || rMappen.length === 0) return [];
    return rMappen.map((rMap) => mapJaarbijlageMap(rMap));
}

function mapJaarbijlageMap(rMap: RStudiewijzerJaarBijlageMap): SJaarbijlageMap {
    const result: SJaarbijlageMap = {
        id: getEntiteitId(rMap),
        naam: rMap.naam ?? DEFAULT_STRING,
        sortering: rMap.sortering ?? -1
    };
    return result;
}

function mapJaarbijlagen(rJaarbijlagen?: Array<RStudiewijzerJaarBijlage>): SJaarbijlage[] {
    if (!rJaarbijlagen || rJaarbijlagen.length === 0) return [];

    return rJaarbijlagen
        .map((rJaarbijlage) => {
            const afspraakBijlage = mapAfspraakBijlage(rJaarbijlage);
            if (!afspraakBijlage) return undefined;

            return { ...afspraakBijlage, map: rJaarbijlage.jaarbijlageMap ? mapJaarbijlageMap(rJaarbijlage.jaarbijlageMap) : undefined };
        })
        .filter((jaarbijlage): jaarbijlage is SJaarbijlage => !!jaarbijlage);
}

function mapJaarExternMateriaal(
    rExterneMaterialen?: Array<RStudiewijzerJaarExternMateriaal>,
    rStudiewijzer?: RStudiewijzer
): SJaarExternMateriaal[] {
    if (!rExterneMaterialen || rExterneMaterialen.length === 0) return [];

    const studiewijzer = mapStudiewijzer(rStudiewijzer);
    return rExterneMaterialen
        .map((rExternMateriaal) => {
            const externMateriaal = mapExternMateriaal(rExternMateriaal, studiewijzer);
            if (!externMateriaal) return undefined;

            return {
                ...externMateriaal,
                map: rExternMateriaal.jaarbijlageMap ? mapJaarbijlageMap(rExternMateriaal.jaarbijlageMap) : undefined
            };
        })
        .filter((externMateriaal): externMateriaal is SJaarExternMateriaal => !!externMateriaal);
}

function mapLeermiddelen(rLeermiddelKeuzes?: Array<RLeermiddelKeuze>): SLeermiddel[] {
    if (!rLeermiddelKeuzes || rLeermiddelKeuzes.length === 0) return [];

    return rLeermiddelKeuzes.map((rLeermiddelKeuze) => {
        return {
            id: getEntiteitId(rLeermiddelKeuze),
            titel: rLeermiddelKeuze.leermiddel?.titel ?? DEFAULT_STRING,
            url: rLeermiddelKeuze.leermiddel?.url ?? DEFAULT_STRING,
            uuid: rLeermiddelKeuze.UUID ?? DEFAULT_STRING,
            type: 'INTERN_BOEKENFONDS',
            leermiddelUuid: rLeermiddelKeuze.leermiddel?.UUID ?? DEFAULT_STRING,
            methodeInformatie:
                mapLeermiddelMethode(rLeermiddelKeuze.leermiddel?.methode) ??
                mapMethodeInformatie(rLeermiddelKeuze.leermiddel?.methodeInformatie)
        };
    });
}

function mapMethodeInformatie(info?: RMethodeInformatie): SMethodeInfomatie | undefined {
    if (!info) return undefined;

    return {
        uuid: info.UUID ?? DEFAULT_STRING,
        methode: info.methode ?? DEFAULT_STRING,
        uitgever: info.uitgever ?? DEFAULT_STRING
    };
}

function mapLeermiddelMethode(methode?: RLeermiddelMethode): SMethodeInfomatie | undefined {
    if (!methode) return undefined;

    return {
        uuid: methode.UUID ?? DEFAULT_STRING,
        methode: methode.naam ?? DEFAULT_STRING,
        uitgever: methode.uitgevernaam ?? DEFAULT_STRING
    };
}
