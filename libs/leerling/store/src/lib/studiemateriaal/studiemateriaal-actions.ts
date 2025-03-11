export class RefreshStudiemateriaal {
    static readonly type = '[Studiemateriaal] Refresh Studiemateriaal';

    constructor(
        public vakUuid?: string,
        public lesgroepUuid?: string
    ) {}
}

export class RefreshEduRoutePortalProducts {
    static readonly type = '[Studiemateriaal] Refresh EduRoutePortalProducts';

    constructor(public isLeerling: boolean) {}
}

export class RefreshVakkenMetStudiemateriaal {
    static readonly type = '[Studiemateriaal] Refresh VakkenMetStudiemateriaal';
}
