import { IconBericht, IconHuiswerk, IconKalenderToevoegen, IconName, IconResultaten, IconRooster, IconVandaag } from 'harmony-icons';
import { AccountRecht } from 'leerling/store';
import { AFWEZIG_MELDEN, BERICHTEN, CIJFERS, ROOSTER, STUDIEWIJZER, VANDAAG } from '../router/router.service';

export interface TabItem {
    icon: IconName;
    titel: string;
    titelDesktop?: string;
    url: string;
    recht?: AccountRecht | AccountRecht[];
    alleenVoorVerzorger?: true;
    inverseRechten?: boolean;
    counter?: { count: number; label: string };
}

export const VANDAAG_TAB: TabItem = {
    icon: IconVandaag.name,
    titel: 'Vandaag',
    url: VANDAAG,
    recht: ['roosterBekijkenAan', 'huiswerkBekijkenAan'],
    inverseRechten: true
};

export const ROOSTER_TAB: TabItem = {
    icon: IconRooster.name,
    titel: 'Rooster',
    recht: 'roosterBekijkenAan',
    url: ROOSTER
};

export const STUDIEWIJZER_TAB: TabItem = {
    icon: IconHuiswerk.name,
    titel: 'Studiewijzer',
    recht: 'huiswerkBekijkenAan',
    url: STUDIEWIJZER
};

export const CIJFERS_TAB: TabItem = {
    icon: IconResultaten.name,
    titel: 'Cijfers',
    recht: 'cijfersBekijkenAan',
    url: CIJFERS
};

export const AFWEZIG_MELDEN_TAB: TabItem = {
    icon: IconKalenderToevoegen.name,
    titel: 'Afwezig',
    titelDesktop: 'Afwezig melden',
    recht: 'absentiesBekijkenAan',
    alleenVoorVerzorger: true,
    url: AFWEZIG_MELDEN
};

export const BERICHTEN_TAB: TabItem = {
    icon: IconBericht.name,
    titel: 'Berichten',
    recht: 'berichtenBekijkenAan',
    url: BERICHTEN
};
