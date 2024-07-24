import { isPresent } from 'harmony';
import { RLeerlingVakGemiddelde, RLeerlingVakGemiddelden } from 'leerling-codegen';
import { orderBy } from 'lodash-es';
import {
    SGeldendResultaat,
    SGeldendVoortgangsdossierResultaat,
    mapGeldendResultaat,
    mapGeldendVoortgangsdossierResultaat
} from '../../resultaat/geldendresultaat-model';
import { SVakkeuze, mapVakkeuze } from '../vakkeuze-model';

export interface SVakkeuzeGemiddeldeModel {
    vakkeuzeGemiddelden: SVakkeuzeGemiddelden[] | undefined;
}

export interface SVakkeuzeGemiddelden {
    plaatsingUuid: string;
    vakkeuzes: SVakkeuzeGemiddelde[];
    voortgangsdossierGemiddelde: string | undefined;
}

export interface SVakkeuzeGemiddelde {
    vakkeuze: SVakkeuze;
    vakAnderNiveau: string | undefined;
    niveauOmschrijving: string | undefined;
    afwijkendNiveauOmschrijving: string | undefined;
    voortgangsdossierResultaat: SGeldendVoortgangsdossierResultaat | undefined;
    voortgangsdossierResultaatAfwijkend: SGeldendVoortgangsdossierResultaat | undefined;
    examendossierResultaat: SGeldendResultaat | undefined;
}

export function mapVakGemiddelden(vakgemiddelden: RLeerlingVakGemiddelden, plaatsingUuid: string): SVakkeuzeGemiddelden {
    return {
        plaatsingUuid: plaatsingUuid,
        vakkeuzes:
            orderBy(vakgemiddelden.gemiddelden?.map(mapVakGemiddelde).filter(isPresent), (gemiddelde) =>
                gemiddelde.vakkeuze.vak.naam.toLocaleLowerCase()
            ) ?? [],
        voortgangsdossierGemiddelde: vakgemiddelden.voortgangsdossierGemiddelde?.toFixed(1).toString().replace('.', ',') ?? undefined
    };
}

export function mapVakGemiddelde(vakgemiddelde: RLeerlingVakGemiddelde): SVakkeuzeGemiddelde | undefined {
    const vakkeuze = vakgemiddelde.vakkeuze ? mapVakkeuze(vakgemiddelde.vakkeuze) : undefined;
    if (!vakkeuze) return undefined;
    return {
        vakkeuze: vakkeuze,
        vakAnderNiveau: vakgemiddelde.vakAnderNiveau,
        niveauOmschrijving: vakgemiddelde.niveauOmschrijving,
        afwijkendNiveauOmschrijving: vakgemiddelde.afwijkendNiveauOmschrijving,
        voortgangsdossierResultaat: vakgemiddelde.voortgangsdossierResultaat
            ? mapGeldendVoortgangsdossierResultaat(vakgemiddelde.voortgangsdossierResultaat)
            : undefined,
        voortgangsdossierResultaatAfwijkend: vakgemiddelde.voortgangsdossierResultaatAfwijkend
            ? mapGeldendVoortgangsdossierResultaat(vakgemiddelde.voortgangsdossierResultaatAfwijkend)
            : undefined,
        examendossierResultaat: vakgemiddelde.examendossierResultaat
            ? mapGeldendResultaat('Examen', vakgemiddelde.examendossierResultaat)
            : undefined
    };
}
