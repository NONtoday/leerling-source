import { inject, Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch, removeItem } from '@ngxs/store/operators';
import { OAuthService } from 'angular-oauth2-oidc';
import { RAccount } from 'leerling-codegen';
import { RequestInformationBuilder } from 'leerling-request';
import { tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState } from '../util/abstract-state';
import { RefreshRechten, RemoveRechten, SanitizeRechten } from './rechten-action';
import { mapAccountRechtenModel, SAccountRechtenModel, SRechtenModel } from './rechten-model';

export const RECHTEN_STATE_TOKEN = new StateToken<SRechtenModel>('rechten');
const DEFAULT_STATE: SRechtenModel = {
    accounts: [],
    isVerzorger: false
};

@State<SRechtenModel>({
    name: RECHTEN_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class RechtenState extends AbstractState {
    private _oauthService: OAuthService = inject(OAuthService);

    @Action(RefreshRechten)
    refreshRechten(ctx: StateContext<SRechtenModel>, action: RefreshRechten) {
        const accountContextID = this.getContextID();
        const tokenAvailable = this._oauthService.hasValidAccessToken();
        if (!accountContextID || !tokenAvailable) {
            return;
        }

        // We geven ook de account-id mee, om bij een verkeerde inlog sn
        return this.cachedGet<RAccount>(
            'account/me',
            new RequestInformationBuilder().additional('restricties').parameter('dummy-param-account', accountContextID).build(),
            { force: action.forceUpdate }
        )?.pipe(
            tap((account) => {
                const combinedState = [...ctx.getState().accounts, mapAccountRechtenModel(account, accountContextID)];
                ctx.setState(
                    patch<SRechtenModel>({
                        accounts: this.ontdubbelRechten(combinedState),
                        isVerzorger: account.persoon?.links?.[0].type === 'verzorger.RVerzorger'
                    })
                );
            })
        );
    }

    @Action(RemoveRechten)
    removeRechten(ctx: StateContext<SRechtenModel>, action: RemoveRechten): void {
        const newState = patch<SRechtenModel>({
            accounts: removeItem<SAccountRechtenModel>((account) => account.localAuthenticationContext === action.localContextUUID)
        });
        ctx.setState(newState);
    }

    @Action(SanitizeRechten)
    sanitizeRechten(ctx: StateContext<SRechtenModel>, action: SanitizeRechten): void {
        const knownSessionIdentifiers: string[] = action.knownSessions || [];
        const sanitizedRechten = ctx.getState().accounts.filter((account) => {
            return knownSessionIdentifiers.includes(account.localAuthenticationContext);
        });
        ctx.setState(
            patch<SRechtenModel>({
                accounts: sanitizedRechten
            })
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<SRechtenModel>): void {
        ctx.setState(patch<SRechtenModel>({ accounts: this.ontdubbelRechten(ctx.getState().accounts) }));
        this._store.dispatch(new RefreshRechten());
    }

    override getTimeout(): number {
        return CallService.RECHTEN_TIMEOUT;
    }

    private ontdubbelRechten(state: SAccountRechtenModel[]): SAccountRechtenModel[] {
        return [...new Map(state.map((account) => [account.localAuthenticationContext, account])).values()];
    }
}
