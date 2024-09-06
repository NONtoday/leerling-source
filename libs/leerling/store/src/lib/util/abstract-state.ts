import { inject, Injectable } from '@angular/core';
import Bugsnag from '@bugsnag/js';
import { StateContext, Store } from '@ngxs/store';
import { produce } from 'immer';
import { Linkable, Wrapper } from 'leerling-codegen';
import { DEFAULT_REQUEST_INFORMATION, RequestInformation, RequestService } from 'leerling-request';
import { EMPTY, expand, Observable, reduce, take, tap } from 'rxjs';
import { CallService, SCallDefinition } from '../call/call.service';
import { SwitchContext } from '../shared/shared-actions';
import { SharedSelectors } from '../shared/shared-selectors';

export const MAX_REQUESTS = 5;

export interface Callproperties {
    customTimeout?: number;
    force?: boolean;
}

/**
 * Update 1 newItem in de huidige state als deze gevonden wordt op basis van de idFunction; voeg deze anders toe aan het einde van de state.
 */
export function insertOrUpdateItem<T>(idFunction: (item: T) => any, newItem: T) {
    return produce((draft: T[]) => {
        const index = draft?.findIndex((item) => idFunction(item) === idFunction(newItem));
        if (index >= 0) {
            draft[index] = newItem;
        } else {
            draft?.push(newItem);
        }
    });
}

@Injectable({
    providedIn: 'root'
})
export abstract class AbstractState {
    protected _callService = inject(CallService);
    protected _store = inject(Store);

    protected requestService = inject(RequestService);

    protected createCallDefinition(callNaam: string, timeout: number, ...parameters: any[]): SCallDefinition {
        return { callNaam: callNaam, parameters: parameters, timeout: timeout };
    }

    protected getLeerlingID(): number | undefined {
        return this._store.selectSnapshot(SharedSelectors.getAccountContext()).leerlingId;
    }

    protected getAccountUUID(): string | undefined {
        return this._store.selectSnapshot(SharedSelectors.getAccountContext()).accountUUID;
    }

    protected getContextID(): string {
        return this._store.selectSnapshot(SharedSelectors.getAccountContext()).localAuthenticationContext;
    }

    abstract switchContext(ctx: StateContext<any>, action: SwitchContext): void;

    abstract getTimeout(): number;

    protected isOffline(): boolean {
        return !this._store.selectSnapshot(SharedSelectors.getConnectionStatus()).isOnline;
    }
    protected cachedGet<T extends Linkable | object>(
        urlPostfix: string,
        requestInfo: RequestInformation = DEFAULT_REQUEST_INFORMATION,
        callProperties: Callproperties = {}
    ): Observable<T> | undefined {
        if (this.isOffline()) {
            return;
        }
        const timeout = callProperties.customTimeout ?? this.getTimeout();
        const callDefinition = this.createCallDefinition(urlPostfix, timeout, requestInfo);
        if (!callProperties.force && this.isFresh(callDefinition)) {
            return;
        }
        this._callService.storeCallStart(callDefinition);
        return this.requestService.get<T>(urlPostfix, requestInfo).pipe(
            tap(() => {
                this._callService.storeCallSuccess(callDefinition);
            })
        );
    }

    protected cachedUnwrappedGet<T extends Linkable | object>(
        urlPostfix: string,
        requestInfo: RequestInformation = DEFAULT_REQUEST_INFORMATION,
        callproperties: Callproperties = {}
    ): Observable<T[]> | undefined {
        if (this.isOffline()) {
            return;
        }

        const timeout = callproperties.customTimeout ?? this.getTimeout();

        const callDefinition = this.createCallDefinition(urlPostfix, timeout, requestInfo);
        if (!callproperties.force && this.isFresh(callDefinition)) {
            return;
        }
        this._callService.storeCallStart(callDefinition);

        return this.requestService.getWithResponse<Wrapper<T>>(urlPostfix, requestInfo).pipe(
            expand((response) => {
                const contentRange = response.headers.get('Content-Range') ?? '';

                // Values in array: Content-Range header, rangeStart, rangeEnd, total
                const [, , rangeEnd, total] = (contentRange.match(/(\d+)-(\d+)\/(\d+)/) || []).map(Number);
                const nextStart = rangeEnd + 1;
                const rangeCompleted = !contentRange || total === 0 || nextStart >= total;
                if (rangeCompleted) {
                    return EMPTY;
                }

                return this.requestService.getWithResponse<Wrapper<T>>(urlPostfix, {
                    ...requestInfo,
                    headers: {
                        ...requestInfo.headers,
                        Range: `items=${nextStart}-${rangeEnd + Math.min(Number(total) - Number(rangeEnd), 100)}`
                    }
                });
            }),
            take(MAX_REQUESTS),
            reduce((acc: T[], current) => acc.concat(current.body?.items ?? []), []),
            tap(() => {
                this._callService.storeCallSuccess(callDefinition);
            })
        );
    }

    protected isFresh(...callDefinitions: SCallDefinition[]): boolean {
        if (callDefinitions.length === 0) return false;

        const callsFresh = callDefinitions.map(
            (callDefinition) => this._callService.isCallStillFresh(callDefinition) || this._callService.isCallRecentlyMade(callDefinition)
        );

        return callsFresh.every(Boolean);
    }

    protected logRequestError(urlPostfix: string, requestInfo: RequestInformation) {
        Bugsnag.notify(
            new Error(
                `Huiswerk moet ververst worden maar request voor ${urlPostfix} is undefined, requestInformation: ${JSON.stringify(requestInfo)}, netwerkstatus: ${this.isOffline()}`
            )
        );
    }
}
