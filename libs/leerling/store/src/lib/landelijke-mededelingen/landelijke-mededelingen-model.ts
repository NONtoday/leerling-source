/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { isPresent } from 'harmony';
import { RLandelijkeMededeling } from 'leerling-codegen';
import { MessageType } from '../infomessage/infomessage-model';
import { toLocalDateTime } from '../util/date-util';

export type NotificatieNiveau = 'INFO' | 'ERROR' | 'WARNING' | 'POSITIVE' | undefined;

export type NotificatieType = 'Schermvullend' | 'Notificatie' | 'ItemMarkering';

export interface SLandelijkeMededelingenModel {
    accounts: SLandelijkeMededelingenAccountContext[] | undefined;
}

export interface SLandelijkeMededelingenAccountContext {
    accountUUID: string;
    mededelingen: SLandelijkeMededeling[] | undefined;
}

export interface SLandelijkeMededeling {
    id: number;
    isGelezen: boolean;
    startPublicatie: Date;
    eindPublicatie: Date;
    notificatieNiveau: MessageType;
    notificatieType: NotificatieType;
    onderwerp: string;
    inhoud: string;
    xpath?: string;
}

export function mapMededelingAccountContext(
    accountUUID: string,
    mededelingen: RLandelijkeMededeling[]
): SLandelijkeMededelingenAccountContext {
    return {
        accountUUID: accountUUID,
        mededelingen: mededelingen.map(mapMededeling).filter(isPresent)
    };
}

export function mapMededeling(landelijkeMededeling: RLandelijkeMededeling): SLandelijkeMededeling | undefined {
    if (!landelijkeMededeling.id) return undefined;
    return {
        id: landelijkeMededeling.id,
        isGelezen: false,
        startPublicatie: toLocalDateTime(landelijkeMededeling.startPublicatie!),
        eindPublicatie: toLocalDateTime(landelijkeMededeling.eindPublicatie!),
        notificatieNiveau: mapMessageType(landelijkeMededeling),
        notificatieType: landelijkeMededeling.notificatieType ?? 'Notificatie',
        onderwerp: landelijkeMededeling.onderwerp ?? '',
        inhoud: landelijkeMededeling.inhoud ?? '',
        xpath: landelijkeMededeling.xpath
    };
}

export function mapMessageType(mededeling: RLandelijkeMededeling): MessageType {
    switch (mededeling.notificatieNiveau) {
        case 'INFO':
            return 'info';
        case 'ERROR':
            return 'error';
        case 'WARNING':
            return 'warning';
        case 'POSITIVE':
            return 'success';
        default:
            return 'info';
    }
}
