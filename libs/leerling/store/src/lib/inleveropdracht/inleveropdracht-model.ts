import { isPresent } from 'harmony';
import { RInlevering, RLeerlingInleveringDetails } from 'leerling-codegen';
import { mapBoodschap, SBoodschap } from '../bericht/bericht-model';
import { getAssemblyResult } from '../bijlage/bijlage-util';
import { getEntiteitId } from '../util/entiteit-model';

export const ADDITIONAL_GROEP_INLEVERAAR = 'GROEP_INLEVERAAR';

export type InleveringStatus = 'TE_BEOORDELEN' | 'IN_BEHANDELING' | 'AKKOORD' | 'HEROPEND';

export function mapInleverDetails(details: RLeerlingInleveringDetails): SInleverDetails {
    return {
        url: details.latestTurnitInEulaUrl,
        aantalInleveringenInVerwerking: details.aantalInleveringenInVerwerking ?? 0,
        inleveringen: details.inleveringen?.map((inlevering) => mapInlevering(inlevering)).filter(isPresent) ?? [],
        conversatie: details.conversatie?.boodschappen?.map((conversatie) => mapBoodschap(conversatie)) ?? []
    };
}

export function mapInlevering(inlevering: RInlevering): SInlevering | undefined {
    const internalMap = (omschrijving: string, url: string | undefined, extensie: string) => ({
        id: getEntiteitId(inlevering),
        verzendDatum: inlevering.verzendDatum ? new Date(inlevering.verzendDatum) : new Date(),
        omschrijving,
        url,
        extensie,
        status: inlevering.status ?? 'TE_BEOORDELEN',
        statusWijzigingsDatum: inlevering.wijzigingsDatum ? new Date(inlevering.wijzigingsDatum) : new Date(),
        projectgroepInleveraar: inlevering.additionalObjects?.[ADDITIONAL_GROEP_INLEVERAAR]
    });

    const assemblyResult = getAssemblyResult(inlevering.assemblyResults ?? []);
    if (assemblyResult) {
        if (assemblyResult.fileName && assemblyResult.fileUrl && assemblyResult.fileExtension) {
            return internalMap(assemblyResult.fileName, assemblyResult.fileUrl, assemblyResult.fileExtension);
        }
        return undefined;
    }

    // Andere inleveringen zijn url's
    if (!inlevering.uploadContext && inlevering.inhoud) {
        return internalMap(inlevering.inhoud, inlevering.inhoud, 'URL');
    }
    return undefined;
}

export interface SInlevering {
    id: number;
    verzendDatum: Date;
    omschrijving: string;
    url: string | undefined;
    extensie: string;
    status: InleveringStatus;
    statusWijzigingsDatum: Date;
    projectgroepInleveraar?: string;
}

export interface SInleverDetails {
    url?: string;
    aantalInleveringenInVerwerking: number;
    inleveringen: SInlevering[];
    conversatie: SBoodschap[];
}

export interface SInleverModel {
    inleverDetails: { [toekenningId: number]: SInleverDetails } | undefined;
}

export enum RAssemblyFileType {
    THUMBNAIL = 'THUMBNAIL',
    IMAGE = 'IMAGE',
    IMAGE_PREVIEW = 'IMAGE_PREVIEW',
    VIDEO = 'VIDEO',
    VIDEO_PREVIEW = 'VIDEO_PREVIEW',
    DOCUMENT = 'DOCUMENT',
    SCORM = 'SCORM',
    SCORM_CONTENTS = 'SCORM_CONTENTS',
    MISC = 'MISC',
    AUDIO = 'AUDIO'
}
