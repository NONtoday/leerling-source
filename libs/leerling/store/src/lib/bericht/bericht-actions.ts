import { NieuwBerichtInput, ReactieBerichtInput, RefreshConversatieOptions, SBoodschap, SConversatie } from './bericht-model';

export class RefreshConversaties {
    static readonly type = '[Conversaties] Refresh Conversaties';
    constructor(public refreshOptions: RefreshConversatieOptions = { alleConversaties: false }) {}
}
export class MarkeerGelezen {
    static readonly type = '[Conversaties] Markeer gelezen';
    constructor(public conversatie: SConversatie) {}
}

export class MarkeerInleverboodschapGelezen {
    static readonly type = '[Conversaties] Markeer inleverboodschap gelezen';
    constructor(public boodschap: SBoodschap) {}
}

export class MarkeerOngelezen {
    static readonly type = '[Conversaties] Markeer Ongelezen';
    constructor(public conversatie: SConversatie) {}
}

export class VerwijderConversatie {
    static readonly type = '[Conversaties] verwijder conversatie';
    constructor(public conversatie: SConversatie) {}
}

export class RefreshToegestaneOntvangers {
    static readonly type = '[Conversaties] Refresh Toegestane Ontvangers';
}

export class VerstuurNieuwBericht {
    static readonly type = '[Conversaties] Verstuur Nieuw Bericht';

    constructor(public nieuwBerichtInput: NieuwBerichtInput) {}
}

export class VerstuurReactieBericht {
    static readonly type = '[Conversaties] Verstuur Reactie Bericht';

    constructor(
        public conversatie: SConversatie,
        public reactieBerichtInput: ReactieBerichtInput
    ) {}
}

export class GetExtraOntvangersBoodschap {
    static readonly type = '[Conversaties] Get Extra Ontvangers Boodschap';

    constructor(
        public conversatie: SConversatie,
        public boodschapId: number
    ) {}
}
