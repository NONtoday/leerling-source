import { Injectable } from '@angular/core';
import { Action, State, StateContext, StateToken } from '@ngxs/store';
import { patch } from '@ngxs/store/operators';
import { RExamendossierContext } from 'leerling-codegen';
import { tap } from 'rxjs';
import { CallService } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { AbstractState } from '../util/abstract-state';
import { RefreshExamendossierContexten } from './examendossiercontext-actions';
import { mapRExamendossierContext, SExamendossierContextModel } from './examendossiercontext-model';

export const EXAMENDOSSIER_CONTEXT_STATE_TOKEN = new StateToken<SExamendossierContextModel>('examendossiercontexten');
const DEFAULT_STATE: SExamendossierContextModel = { contexten: undefined };

@State<SExamendossierContextModel>({
    name: EXAMENDOSSIER_CONTEXT_STATE_TOKEN,
    defaults: DEFAULT_STATE
})
@Injectable({
    providedIn: 'root'
})
export class ExamendossierContextState extends AbstractState {
    @Action(RefreshExamendossierContexten)
    refreshExamendossierContexten(ctx: StateContext<SExamendossierContextModel>) {
        const leerlingID = this.getLeerlingID();
        if (!leerlingID) {
            return;
        }

        return this.cachedUnwrappedGet<RExamendossierContext>('geldendexamendossierresultaten/leerling/context/' + leerlingID)?.pipe(
            tap((contexten) => ctx.setState(patch({ contexten: contexten.map((context) => mapRExamendossierContext(context)) })))
        );
    }

    @Action(SwitchContext)
    override switchContext(ctx: StateContext<any>): void {
        ctx.setState(DEFAULT_STATE);
    }
    override getTimeout(): number {
        return CallService.EXAMENDOSSIER_CONTEXT_TIMEOUT;
    }
}
