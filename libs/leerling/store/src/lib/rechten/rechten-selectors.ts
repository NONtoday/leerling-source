import { createSelector } from '@ngxs/store';
import { SSharedStateModel } from '../shared/shared-model';
import { SharedSelectors } from '../shared/shared-selectors';
import { SAccountRechtenModel, SRechten, SRechtenModel } from './rechten-model';
import { RechtenState } from './rechten-state';

export interface AccountContextMetRechten {
    localAuthenticationContext: string;
    leerlingId?: number;
    rechten?: SRechten;
}

export class RechtenSelectors {
    public static getRechten() {
        return createSelector([RechtenState], (state: SRechtenModel): SAccountRechtenModel[] => {
            return state.accounts ?? [];
        });
    }

    private static _getCurrentAccountMetLeerlingenRechten() {
        return createSelector(
            [this.getRechten(), SharedSelectors.getAccountContext()],
            (accounts: SAccountRechtenModel[], state: SSharedStateModel): SAccountRechtenModel | undefined => {
                return accounts?.find(
                    (account: SAccountRechtenModel) => account?.localAuthenticationContext === state?.localAuthenticationContext
                );
            }
        );
    }

    public static getCurrentAccountRechten() {
        return createSelector(
            [this._getCurrentAccountMetLeerlingenRechten(), SharedSelectors.getAccountContext()],
            (account: SAccountRechtenModel, state: SSharedStateModel): SRechten => {
                return account?.leerlingen?.find((rechten: SRechten) => rechten.leerlingId === state.leerlingId) ?? {};
            }
        );
    }

    public static getAccountContextMetRechten() {
        return createSelector(
            [this.getCurrentAccountRechten(), SharedSelectors.getAccountContext()],
            (rechten: SRechten, accountState: SSharedStateModel): AccountContextMetRechten => {
                return {
                    localAuthenticationContext: accountState.localAuthenticationContext,
                    leerlingId: accountState.leerlingId,
                    rechten: rechten
                };
            }
        );
    }

    public static heeftRecht(recht: keyof SRechten) {
        return createSelector([this.getCurrentAccountRechten()], (rechten: SRechten) => {
            if (!rechten) return false;

            return !!rechten[recht];
        });
    }

    public static currentAccountIsVerzorger() {
        return createSelector([RechtenState], (state: SRechtenModel): boolean => {
            return state.isVerzorger;
        });
    }
}
