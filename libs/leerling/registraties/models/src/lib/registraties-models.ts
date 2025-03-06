import { RRegistratie } from 'leerling-codegen';
import { SAfspraakItem } from 'leerling/store';
import { SlugifyPipe } from 'ngx-pipes';

export const LOCALSTORAGE_KEY_TIJDSPAN = 'sll-registraties-tijdspan';

export interface SRegistratiesState {
    selectedTijdspan: SRegistratiePeriode;
    'Laatste 7 dagen': SRegistraties | undefined;
    'Laatste 30 dagen': SRegistraties | undefined;
    'Deze periode': SRegistraties | undefined;
    'Dit schooljaar': SRegistraties | undefined;
    isLoading: boolean;
}

export interface SRegistraties {
    afwezigWaarnemingen: SRegistratie[];
    geoorloofdAfwezig: SRegistratie[];
    ongeoorloofdAfwezig: SRegistratie[];
    teLaat: SRegistratie[];
    verwijderd: SRegistratie[];
    huiswerkNietInOrde: SRegistratie[];
    materiaalNietInOrde: SRegistratie[];
}

export interface SRegistratie {
    afgehandeld: boolean;
    begin: Date;
    eind: Date | undefined;
    minutenGemist: number;
    omschrijving: string;
    afspraken: SAfspraakItem[];
}

export type SVakRegistraties = Pick<RRegistratie, 'beginDatumTijd' | 'eindDatumTijd' | 'absentieReden' | 'opmerkingen'>;
export const registratiePeriodes = ['Laatste 7 dagen', 'Laatste 30 dagen', 'Deze periode', 'Dit schooljaar'] as const;
export type SRegistratiePeriode = (typeof registratiePeriodes)[number];
export type RMentordashboardOverzichtPeriode = 'ZEVEN_DAGEN' | 'DERTIG_DAGEN' | 'CIJFERPERIODE' | 'SCHOOLJAAR';

export const registratieCategorieNamen = [
    'Afwezig',
    'Afwezig ongeoorloofd',
    'Afwezig geoorloofd',
    'Te laat',
    'Verwijderd uit les',
    'Huiswerk niet in orde',
    'Materiaal niet in orde'
] as const;
export type SRegistratieCategorieNaam = (typeof registratieCategorieNamen)[number];

const categorieSlugifyMap = (() => {
    const slugify = new SlugifyPipe();
    const map = new Map<SRegistratieCategorieNaam, string>();
    registratieCategorieNamen.forEach((naam) => {
        map.set(naam, slugify.transform(naam));
    });
    return map;
})();

export const getSlugifiedCategorieNaam = (categorie: SRegistratieCategorieNaam) => categorieSlugifyMap.get(categorie);

export const getRegistratieCategorieNaam = (value: string | null | undefined): SRegistratieCategorieNaam | undefined =>
    Array.from(categorieSlugifyMap.entries()).find((entry) => entry[1] === value)?.[0];
