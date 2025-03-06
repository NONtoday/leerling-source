import { IconBericht, IconHuiswerk, IconName, IconPersoonKruisBlock, IconResultaten, IconRooster, IconVandaag } from 'harmony-icons';
import { AccountRecht } from 'leerling/store';
import { AFWEZIGHEID, BERICHTEN, CIJFERS, ROOSTER, STUDIEWIJZER, VANDAAG } from '../router/router.service';

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

export const AFWEZIGHEID_TAB: TabItem = {
    icon: IconPersoonKruisBlock.name,
    titel: 'Afwezig',
    titelDesktop: 'Afwezigheid',
    recht: 'absentiesBekijkenAan',
    url: AFWEZIGHEID,
    alleenVoorVerzorger: true
};

export const BERICHTEN_TAB: TabItem = {
    icon: IconBericht.name,
    titel: 'Berichten',
    recht: 'berichtenBekijkenAan',
    url: BERICHTEN
};
