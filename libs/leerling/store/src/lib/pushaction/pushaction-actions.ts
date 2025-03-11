import { AvailablePushType } from './pushaction-model';

export class IncomingPushAction {
    static readonly type = '[PushActions] Incoming Push Action';

    constructor(
        public type: AvailablePushType,
        public leerlingId?: number,
        public entityId?: number,
        public triggered = false
    ) {}
}

export class ClearPushAction {
    static readonly type = '[PushAction] Clear';
}
