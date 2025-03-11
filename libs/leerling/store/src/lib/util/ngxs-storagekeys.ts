import { LOCAL_STORAGE_ENGINE } from '@ngxs/storage-plugin';
import { AfspraakState } from '../afspraak/afspraak-state';
import { HuiswerkState } from '../huiswerk/huiswerk-state';
import { LandelijkeMededelingenState } from '../landelijke-mededelingen/landelijke-mededelingen-state';
import { RechtenState } from '../rechten/rechten-state';

// StorageKeys toe te voegen voor het dupliceren van de state in de localstorage/sessionstorage
export const nxgsStorageKeys = [
    {
        key: HuiswerkState,
        engine: LOCAL_STORAGE_ENGINE
    },
    {
        key: AfspraakState,
        engine: LOCAL_STORAGE_ENGINE
    },
    {
        key: RechtenState,
        engine: LOCAL_STORAGE_ENGINE
    },
    {
        key: LandelijkeMededelingenState,
        engine: LOCAL_STORAGE_ENGINE
    }
];
