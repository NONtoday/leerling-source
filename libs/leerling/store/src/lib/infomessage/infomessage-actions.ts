export class AddErrorMessage {
    static readonly type = '[InfoMessages] Add Error';

    constructor(public message: string) {}
}

export class AddInfoMessage {
    static readonly type = '[InfoMessages] Add Info';

    constructor(public message: string) {}
}

export class AddWarningMessage {
    static readonly type = '[InfoMessages] Add Warning';

    constructor(public message: string) {}
}

export class AddSuccessMessage {
    static readonly type = '[InfoMessages] Add Success';

    constructor(public message: string) {}
}

export class ClearInfoMessage {
    static readonly type = '[InfoMessages] Clear';
}
