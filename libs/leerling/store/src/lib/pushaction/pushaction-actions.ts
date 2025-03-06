import { AvailablePushType } from './pushaction-model';

export class IncomingPushAction {
    static readonly type = '[PushActions] Incoming Push Action';

    constructor(
        public type: AvailablePushType,
        public leerlingId?: number,
        public accountUUID?: string,
        public entityId?: number,
        public datum?: Date,
        public triggered = false
    ) {}
}

export class ClearPushAction {
    static readonly type = '[PushAction] Clear';
}
