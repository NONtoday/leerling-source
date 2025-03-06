import { SAfspraakActie, SKWTInfo } from './afspraak-model';

export class RefreshAfspraak {
    static readonly type = '[Afspraak] Refresh Afspraak';

    // Jaarweek is bv 2023~12
    // Bewust gekozen voor week ipv datum range, omdat we elke call een unieke dataset willen teruggeven.
    constructor(
        public jaar: number,
        public week: number
    ) {}
}

export class VoerKwtActieUit {
    static readonly type = '[Afspraak] Voer Kwt Keuze uit';

    constructor(
        public kwtInfo: SKWTInfo,
        public afspraakActie: SAfspraakActie,
        public jaarWeek: string
    ) {}
}

export class KwtActieUitvoerenReady {
    static readonly type = '[Afspraak] KWT Actie Uitvoeren ready';

    constructor(public foutmelding?: string) {}
}
