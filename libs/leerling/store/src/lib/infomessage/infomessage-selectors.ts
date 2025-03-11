import { createSelector } from '@ngxs/store';
import { SInfoMessage } from './infomessage-model';
import { InfoMessageState } from './infomessage-state';

export class InfoMessagesSelectors {
    public static getInfoMessages() {
        return createSelector([InfoMessageState], (state: SInfoMessage | undefined) => {
            return state;
        });
    }
}
