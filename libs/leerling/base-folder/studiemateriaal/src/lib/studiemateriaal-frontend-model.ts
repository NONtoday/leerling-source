import { LesstofModel } from 'leerling-lesstof';
import { LeermiddelType, SJaarExternMateriaal, SJaarbijlage, SJaarbijlageMap, SLeermiddel } from 'leerling/store';

export interface JaarBijlage {
    naam: string;
    extension: string;
    uri: string;
    sortering: number;
    bijlageType: 'bijlage' | 'externMateriaal';
    bijlage: SJaarbijlage | SJaarExternMateriaal;
}

export interface JaarbijlageMap {
    id: number;
    naam: string;
    sortering: number;
    jaarbijlagen: JaarBijlage[];
}

export interface JaarbijlagenModel {
    mappen: JaarbijlageMap[];
    jaarbijlagen: JaarBijlage[];
}

export interface LeermiddelModel {
    leermiddelen: Leermiddel[];
    algemeneLeermiddelen: Leermiddel[];
}

export interface Leermiddel {
    type: LeermiddelType;
    titel: string;
    methode?: string;
    uitgever?: string;
    uri: string;
    uuid: string;
    leermiddel: SLeermiddel;
}

export interface Studiemateriaal {
    lesstof: LesstofModel | undefined;
    leermiddelen: LeermiddelModel | undefined;
    jaarbijlagen: JaarbijlagenModel | undefined;
}

export function mapAndSortLeermiddelen(sLeermiddelen: SLeermiddel[]): Leermiddel[] {
    return sLeermiddelen.map((sLeermiddel) => mapLeermiddel(sLeermiddel)).sort((a, b) => a.titel.localeCompare(b.titel));
}

export function mapLeermiddel(leermiddel: SLeermiddel): Leermiddel {
    return {
        titel: leermiddel.titel,
        methode: leermiddel.methodeInformatie?.methode,
        uitgever: leermiddel.methodeInformatie?.uitgever,
        uri: leermiddel.url,
        uuid: leermiddel.uuid,
        type: leermiddel.type,
        leermiddel: leermiddel
    };
}

export function mapExternMateriaal(sExternMateriaal: SJaarExternMateriaal): JaarBijlage {
    return {
        naam: sExternMateriaal.omschrijving,
        sortering: sExternMateriaal.sortering,
        uri: sExternMateriaal.uri,
        extension: 'url',
        bijlage: sExternMateriaal,
        bijlageType: 'externMateriaal'
    };
}

export function mapJaarbijlage(sJaarbijlage: SJaarbijlage): JaarBijlage {
    return {
        naam: sJaarbijlage.omschrijving,
        sortering: sJaarbijlage.sortering,
        uri: sJaarbijlage.fileUrl,
        extension: sJaarbijlage.fileExtension,
        bijlage: sJaarbijlage,
        bijlageType: 'bijlage'
    };
}

export function mapJaarbijlageMap(sJaarbijlageMap: SJaarbijlageMap): JaarbijlageMap {
    return {
        id: sJaarbijlageMap.id,
        naam: sJaarbijlageMap.naam,
        sortering: sJaarbijlageMap.sortering,
        jaarbijlagen: []
    };
}
