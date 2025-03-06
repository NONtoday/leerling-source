export enum AvailablePushType {
    CIJFERS = 'CIJFERS',
    BERICHTEN = 'BERICHTEN',
    AFWEZIGHEID = 'AFWEZIGHEID',
    INLEVERPERIODEBERICHT = 'INLEVERPERIODEBERICHT'
}
export interface SPushAction {
    type: AvailablePushType;
    leerlingId?: number;
    accountUUID?: string;
    entityId?: number;
    datum?: Date;
    triggered: boolean; // frontend incoming messages aren't triggered, when user actually clicks on the notification this will be set to true
}
