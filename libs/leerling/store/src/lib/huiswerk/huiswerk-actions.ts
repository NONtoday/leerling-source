import { SStudiewijzerItem } from './huiswerk-model';

export class RefreshHuiswerk {
    static readonly type = '[Huiswerk] Refresh Huiswerk';

    // Jaarweek is bv 2023~12
    // Bewust gekozen voor week ipv datum range, omdat we elke call een unieke dataset willen teruggeven.

    constructor(public jaarWeek: string) {}
}

export class ToggleAfgevinkt {
    static readonly type = '[Huiswerk] Toggle Afgevinkt';

    constructor(public item: SStudiewijzerItem) {}
}
