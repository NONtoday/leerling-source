import { SInlevering } from '../inleveropdracht/inleveropdracht-model';
import { SStudiewijzerItem } from './huiswerk-model';

export class RefreshHuiswerk {
    static readonly type = '[Huiswerk] Refresh Huiswerk';

    // Jaarweek is bv 2023~12
    // Bewust gekozen voor week ipv datum range, omdat we elke call een unieke dataset willen teruggeven.

    constructor(
        public jaarWeek: string,
        readonly requestOptions: { forceRequest?: boolean } = {}
    ) {}
}

export class ToggleAfgevinkt {
    static readonly type = '[Huiswerk] Toggle Afgevinkt';

    constructor(public item: SStudiewijzerItem) {}
}

export class UpdateInleveropdrachtStatus {
    static readonly type = '[Huiswerk] Update Inleveropdracht Status';

    constructor(
        public toekenningId: number,
        public datum: Date,
        public inlevering: SInlevering,
        public aantalInleveringenInVerwerking: number
    ) {}
}
