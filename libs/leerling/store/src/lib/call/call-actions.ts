export class StoreCallSuccess {
    static readonly type = '[Call] Register Call Done';

    constructor(
        public callNaam: string,
        public parameters: any[],
        public timeout: number
    ) {}
}

export class StoreCallStart {
    static readonly type = '[Call] Register Call Start';

    constructor(
        public callNaam: string,
        public parameters: any[]
    ) {}
}

/**
 * Verwijdert de call uit het call-model waardoor het eruit ziet alsof de call nooit
 * uitgevoerd is - en hij dus altijd nogmaals uitgevoerd wordt als de data opgevraagd wordt.
 */
export class MarkDirty {
    static readonly type = '[Call] Mark dirty';

    constructor(public callNaam: string) {}
}
