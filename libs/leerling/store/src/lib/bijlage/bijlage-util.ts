import { RAfspraakBijlage, RAssemblyResult, RBoodschapBijlage, RExternMateriaal, RStudieBijlage, RStudiewijzer } from 'leerling-codegen';
import { DEFAULT_STRING, getEntiteitId } from '../util/entiteit-model';
import { SBijlage, SExternmateriaal, SStudiewijzer } from './bijlage-model';

const BIJLAGE_TYPES = ['IMAGE', 'VIDEO', 'DOCUMENT', 'MISC', 'AUDIO'];

export function getAssemblyResult(assemblyResults: RAssemblyResult[] | undefined): RAssemblyResult | undefined {
    return assemblyResults?.find((assembly) => assembly.assemblyFileType && BIJLAGE_TYPES.includes(assembly.assemblyFileType));
}

export function mapAfspraakBijlage(bijlage: RAfspraakBijlage): SBijlage | undefined {
    const assembly = getAssemblyResult(bijlage.assemblyResults);
    if (!assembly?.fileUrl || !assembly.fileSize || !assembly.fileExtension) return undefined;
    return assembly
        ? {
              id: getEntiteitId(bijlage),
              omschrijving: getBijlageOmschrijving(assembly, bijlage.omschrijving),
              fileSize: assembly.fileSize,
              fileUrl: assembly.fileUrl,
              fileExtension: assembly.fileExtension,
              sortering: 0
          }
        : undefined;
}

export function mapStudieBijlage(bijlage: RStudieBijlage): SBijlage | undefined {
    const assembly = getAssemblyResult(bijlage.assemblyResults);
    if (!assembly?.fileUrl || !assembly.fileSize || !assembly.fileExtension) return undefined;
    return assembly
        ? {
              id: getEntiteitId(bijlage),
              omschrijving: getBijlageOmschrijving(assembly, bijlage.omschrijving),
              fileSize: assembly.fileSize,
              fileUrl: assembly.fileUrl,
              fileExtension: assembly.fileExtension,
              sortering: 0
          }
        : undefined;
}

export function getBijlageOmschrijving(assembyResult: RAssemblyResult, bijlageOmschrijving?: string): string {
    return bijlageOmschrijving ?? assembyResult.fileName ?? '-';
}

export function mapStudiewijzer(studiewijzer?: RStudiewijzer): SStudiewijzer | undefined {
    if (!studiewijzer) return undefined;

    return {
        id: getEntiteitId(studiewijzer),
        naam: studiewijzer.naam ?? DEFAULT_STRING,
        uuid: studiewijzer.uuid ?? DEFAULT_STRING
    };
}

export function mapExternMateriaal(externmateriaal: RExternMateriaal, studiewijzer?: SStudiewijzer): SExternmateriaal | undefined {
    if (!externmateriaal.uri) return undefined;

    return {
        id: getEntiteitId(externmateriaal),
        uri: externmateriaal.uri,
        omschrijving: externmateriaal.omschrijving ?? externmateriaal.uri,
        sortering: externmateriaal.sortering ?? 0,
        studiewijzer: studiewijzer
    };
}

export function mapBoodschapBijlage(boodschapBijlage: RBoodschapBijlage): SBijlage | undefined {
    const assembly = getAssemblyResult(boodschapBijlage.assemblyResults);
    if (!assembly?.fileUrl || !assembly.fileSize || !assembly.fileExtension) return undefined;
    return assembly
        ? {
              id: getEntiteitId(boodschapBijlage),
              omschrijving: getBijlageOmschrijving(assembly, boodschapBijlage.omschrijving),
              fileSize: assembly.fileSize,
              fileUrl: assembly.fileUrl,
              fileExtension: assembly.fileExtension,
              sortering: boodschapBijlage.sortering ?? 0
          }
        : undefined;
}
