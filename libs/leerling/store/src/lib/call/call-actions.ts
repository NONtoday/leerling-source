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
