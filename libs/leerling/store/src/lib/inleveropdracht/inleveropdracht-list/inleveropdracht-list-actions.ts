import { SStudiewijzerItem } from '../../huiswerk/huiswerk-model';

export class RefreshInleverOpdrachtList {
    static readonly type = '[InleveropdrachtList] Refresh Inleveropdrachten';
}

export class ToggleInleverOpdrachtAfgevinkt {
    static readonly type = '[InleveropdrachtList] Toggle Inleveropdracht Afgevinkt';

    constructor(
        public item: SStudiewijzerItem,
        public gemaakt: boolean
    ) {}
}
