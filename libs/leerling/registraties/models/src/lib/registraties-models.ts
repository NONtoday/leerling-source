import { RRegistratie } from 'leerling-codegen';

export const LOCALSTORAGE_KEY_TIJDSPAN = 'sll-registraties-tijdspan';

export interface SRegistratiesState {
    selectedTijdspan: SRegistratiePeriode;
    'Laatste 7 dagen': SRegistratieCategorie[] | undefined;
    'Laatste 30 dagen': SRegistratieCategorie[] | undefined;
    'Deze periode': SRegistratieCategorie[] | undefined;
    'Dit schooljaar': SRegistratieCategorie[] | undefined;
    isLoading: boolean;
}

export interface SRegistratieCategorie {
    naam: SRegistratieCategorieNaam;
    aantal: number;
    registraties: SRegistratie[] | undefined;
}

export type SVakRegistraties = Pick<RRegistratie, 'beginDatumTijd' | 'eindDatumTijd' | 'absentieReden' | 'opmerkingen'>;

export interface SRegistratie {
    beginDatumTijd: Date;
    eindDatumTijd: Date | undefined;
    absentieReden: string | undefined;
    opmerkingen: string | undefined;
    vakOfTitel: string | undefined;
    minutenGemist: number | undefined;
    beginLesuur: number | undefined;
    eindLesuur: number | undefined;
}

export const registratiePeriodes = ['Laatste 7 dagen', 'Laatste 30 dagen', 'Deze periode', 'Dit schooljaar'] as const;
export type SRegistratiePeriode = (typeof registratiePeriodes)[number];
export type RMentordashboardOverzichtPeriode = 'ZEVEN_DAGEN' | 'DERTIG_DAGEN' | 'CIJFERPERIODE' | 'SCHOOLJAAR';

export const registratieCategorieNamen = [
    'Afwezig ongeoorloofd',
    'Afwezig geoorloofd',
    'Te laat',
    'Verwijderd uit les',
    'Huiswerk niet in orde',
    'Materiaal niet in orde'
] as const;
export type SRegistratieCategorieNaam = (typeof registratieCategorieNamen)[number];
