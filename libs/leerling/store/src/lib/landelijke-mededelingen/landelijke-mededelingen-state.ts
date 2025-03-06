import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch, updateItem } from '@ngxs/store/operators';
import { isBefore } from 'date-fns';
import { RLandelijkeMededeling } from 'leerling-codegen';
import { RequestInformationBuilder } from 'leerling-request';
import { tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState, insertOrUpdateItem } from '../util/abstract-state';
import { LandelijkeMededelingGelezen, RefreshLandelijkeMededelingen } from './landelijke-mededelingen-actions';
import {
    SLandelijkeMededeling,
    SLandelijkeMededelingenAccountContext,
    SLandelijkeMededelingenModel,
    mapMededelingAccountContext
} from './landelijke-mededelingen-model';

const STATE_NAME = 'landelijkeMededelingen';
export const LANDELIJKE_MEDEDELINGEN_STATE_TOKEN = new StateToken<SLandelijkeMededelingenModel>(STATE_NAME);
const DEFAULT_STATE: SLandelijkeMededelingenModel = { accounts: undefined };

@State<SLandelijkeMededelingenModel>({
    name: LANDELIJKE_MEDEDELINGEN_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class LandelijkeMededelingenState extends AbstractState {
    @Action(RefreshLandelijkeMededelingen)
    RefreshLandelijkeMededelingen(ctx: StateContext<SLandelijkeMededelingenModel>) {
        const accountUUID = this.getAccountUUID();
        if (!accountUUID) return;

        return this.cachedUnwrappedGet<RLandelijkeMededeling>('mededelingen', new RequestInformationBuilder().build())?.pipe(
            tap((mededelingen) => {
                const retrievedAccountMededelingContext = mapMededelingAccountContext(accountUUID, mededelingen);

                const currentState = ctx.getState().accounts;
                if (currentState) {
                    const existingAccountMededelingContext = currentState.find((account) => account.accountUUID === accountUUID);
                    const mergedAccountMededelingContext = existingAccountMededelingContext
                        ? this.mergeAccountContext(retrievedAccountMededelingContext, existingAccountMededelingContext)
                        : retrievedAccountMededelingContext;

                    ctx.setState(
                        patch({
                            accounts: insertOrUpdateItem((account) => account.accountUUID === accountUUID, mergedAccountMededelingContext)
                        })
                    );
                } else {
                    ctx.setState(patch({ accounts: [retrievedAccountMededelingContext] }));
                }
            })
        );
    }

    @Action(LandelijkeMededelingGelezen)
    LandelijkeMededelingGelezen(ctx: StateContext<SLandelijkeMededelingenModel>, action: LandelijkeMededelingGelezen) {
        const accountUUID = this.getAccountUUID();
        if (!accountUUID) return;

        return ctx.setState(
            patch({
                accounts: updateItem<SLandelijkeMededelingenAccountContext>(
                    (account) => account.accountUUID === accountUUID,
                    patch({
                        mededelingen: updateItem<SLandelijkeMededeling>((melding) => melding.id === action.id, patch({ isGelezen: true }))
                    })
                )
            })
        );
    }

    private mergeAccountContext(
        incomingState: SLandelijkeMededelingenAccountContext,
        currentState: SLandelijkeMededelingenAccountContext
    ): SLandelijkeMededelingenAccountContext {
        const today = new Date();
        const filteredCurrentMededelingen = currentState.mededelingen?.filter((mededeling) => !isBefore(mededeling.eindPublicatie, today));

        const mergedMededelingen = incomingState.mededelingen?.map((mededeling) => {
            const existing = filteredCurrentMededelingen?.find((current) => current.id === mededeling.id);
            return { ...mededeling, isGelezen: existing?.isGelezen ?? mededeling.isGelezen };
        });

        return {
            accountUUID: currentState.accountUUID,
            mededelingen: mergedMededelingen
        };
    }

    private ontdubbelLandelijkeMededelingen(
        state: SLandelijkeMededelingenAccountContext[] | undefined
    ): SLandelijkeMededelingenAccountContext[] {
        return state ? [...new Map(state.map((account) => [account.accountUUID, account])).values()] : [];
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SLandelijkeMededelingenModel>, action: SwitchContext) {
        if (!action.initialContextSwitch) {
            ctx.setState(patch<SLandelijkeMededelingenModel>({ accounts: this.ontdubbelLandelijkeMededelingen(ctx.getState().accounts) }));
        }
    }

    override getTimeout(): number {
        return CallService.LANDELIJKE_MEDEDELINGEN_TIMEOUT;
    }

    public static getName(): string {
        return STATE_NAME;
    }
}
